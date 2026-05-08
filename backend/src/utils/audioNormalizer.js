'use strict'

const { spawn, spawnSync } = require('child_process')
const { writeFile, readFile, unlink } = require('fs/promises')
const { tmpdir } = require('os')
const path = require('path')

const FFMPEG_BIN      = process.env.FFMPEG_PATH || 'ffmpeg'
const FFPROBE_BIN     = process.env.FFPROBE_PATH || 'ffprobe'
const FADE_OUT_D      = 4.0   // seconds
const TIMEOUT_MS      = 15_000

// ─── Check FFmpeg availability once at startup ────────────────────────────

const FFMPEG_AVAILABLE = (() => {
  const result = spawnSync(FFMPEG_BIN, ['-version'], { stdio: 'ignore' })
  return result.status === 0
})()

if (FFMPEG_AVAILABLE) {
  console.log(`[audioNormalizer] FFmpeg found — loudness normalization enabled`)
} else {
  console.warn(`[audioNormalizer] FFmpeg not found — normalization will be skipped (raw audio served)`)
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function probeDuration(filePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(FFPROBE_BIN, [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      filePath,
    ])

    let output = ''
    ffprobe.stdout.on('data', (chunk) => { output += chunk })
    ffprobe.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exited ${code}`))
      const duration = parseFloat(output.trim())
      if (isNaN(duration)) return reject(new Error('Could not parse duration'))
      resolve(duration)
    })
    ffprobe.on('error', reject)
  })
}

// ─── Main export ──────────────────────────────────────────────────────────

/**
 * Normalises an MP3 buffer: EBU R128 loudnorm (-18 LUFS / LRA 9), 8 kHz lowpass,
 * 0.5 s fade-in, 4 s fade-out (start time computed via ffprobe). Output at 192 kbps.
 * Always resolves — falls back to the original buffer if FFmpeg is unavailable
 * or fails for any reason, so audio generation is never blocked.
 *
 * @param {Buffer} inputBuffer  — raw MP3 from ElevenLabs
 * @returns {Promise<{ buffer: Buffer, normalized: boolean, reason?: string }>}
 */
async function normalizeLoudness(inputBuffer) {
  if (!FFMPEG_AVAILABLE) {
    return { buffer: inputBuffer, normalized: false, reason: 'ffmpeg not found' }
  }

  const tempIn  = path.join(tmpdir(), `snoozy_raw_${Date.now()}.mp3`)
  const tempOut = path.join(tmpdir(), `snoozy_final_${Date.now()}.mp3`)

  try {
    await writeFile(tempIn, inputBuffer)

    const duration  = await probeDuration(tempIn)
    const fadeStart = Math.max(0, duration - FADE_OUT_D)

    const filterChain = [
      'loudnorm=I=-18:TP=-1.5:LRA=9',
      'lowpass=f=8000',
      'afade=t=in:st=0:d=0.5',
      `afade=t=out:st=${fadeStart.toFixed(3)}:d=${FADE_OUT_D}`,
    ].join(',')

    await new Promise((resolve, reject) => {
      let timedOut = false

      const ff = spawn(FFMPEG_BIN, [
        '-y',
        '-i',   tempIn,
        '-af',  filterChain,
        '-b:a', '192k',
        tempOut,
      ])

      const timeout = setTimeout(() => {
        timedOut = true
        ff.kill('SIGKILL')
        reject(new Error('timeout'))
      }, TIMEOUT_MS)

      // Collect stderr for debugging but don't log by default
      const stderrChunks = []
      ff.stderr.on('data', (chunk) => stderrChunks.push(chunk))

      ff.on('close', (code) => {
        clearTimeout(timeout)
        if (timedOut) return
        if (code !== 0) {
          return reject(new Error(`ffmpeg exit ${code}: ${Buffer.concat(stderrChunks).toString().slice(-300)}`))
        }
        resolve()
      })

      ff.on('error', reject)
    })

    const output = await readFile(tempOut)

    if (output.length < inputBuffer.length * 0.3) {
      return { buffer: inputBuffer, normalized: false, reason: 'output suspiciously small' }
    }

    return { buffer: output, normalized: true }

  } catch (err) {
    return { buffer: inputBuffer, normalized: false, reason: err.message }
  } finally {
    await Promise.all([
      unlink(tempIn).catch(() => {}),
      unlink(tempOut).catch(() => {}),
    ])
  }
}

module.exports = { normalizeLoudness, FFMPEG_AVAILABLE }
