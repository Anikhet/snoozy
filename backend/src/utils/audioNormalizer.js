'use strict'

const { spawn, spawnSync } = require('child_process')

const FFMPEG_BIN     = process.env.FFMPEG_PATH || 'ffmpeg'
const LOUDNORM_AF    = 'loudnorm=I=-16:TP=-1.5:LRA=11'
const TIMEOUT_MS     = 10_000

// ─── Check FFmpeg availability once at startup ────────────────────────────
// Avoids paying the detection cost on every audio request.

const FFMPEG_AVAILABLE = (() => {
  const result = spawnSync(FFMPEG_BIN, ['-version'], { stdio: 'ignore' })
  return result.status === 0
})()

if (FFMPEG_AVAILABLE) {
  console.log(`[audioNormalizer] FFmpeg found — loudness normalization enabled`)
} else {
  console.warn(`[audioNormalizer] FFmpeg not found — normalization will be skipped (raw audio served)`)
}

// ─── Main export ──────────────────────────────────────────────────────────

/**
 * Normalises the loudness of an MP3 buffer to -16 LUFS using FFmpeg loudnorm.
 * Always resolves — falls back to the original buffer if FFmpeg is unavailable
 * or fails for any reason, so audio generation is never blocked.
 *
 * @param {Buffer} inputBuffer  — raw MP3 from ElevenLabs
 * @returns {Promise<{ buffer: Buffer, normalized: boolean, reason?: string }>}
 */
function normalizeLoudness(inputBuffer) {
  if (!FFMPEG_AVAILABLE) {
    return Promise.resolve({ buffer: inputBuffer, normalized: false, reason: 'ffmpeg not found' })
  }

  return new Promise((resolve) => {
    let timedOut = false

    const ff = spawn(FFMPEG_BIN, [
      '-i',    'pipe:0',     // read from stdin
      '-af',   LOUDNORM_AF,  // loudness normalization
      '-f',    'mp3',        // output format
      '-b:a',  '128k',       // maintain 128kbps — same as ElevenLabs source
      '-y',                  // non-interactive
      'pipe:1',              // write to stdout
    ], { stdio: ['pipe', 'pipe', 'pipe'] })

    const timeout = setTimeout(() => {
      timedOut = true
      ff.kill('SIGKILL')
      resolve({ buffer: inputBuffer, normalized: false, reason: 'timeout' })
    }, TIMEOUT_MS)

    const outputChunks = []
    ff.stdout.on('data', (chunk) => outputChunks.push(chunk))

    // FFmpeg writes progress info to stderr — collect for debugging but don't log by default
    const stderrChunks = []
    ff.stderr.on('data', (chunk) => stderrChunks.push(chunk))

    // Suppress EPIPE if FFmpeg exits before we finish writing (shouldn't happen but be safe)
    ff.stdin.on('error', () => {})

    ff.on('close', (code) => {
      clearTimeout(timeout)
      if (timedOut) return

      if (code !== 0) {
        return resolve({ buffer: inputBuffer, normalized: false, reason: `ffmpeg exit ${code}` })
      }

      const output = Buffer.concat(outputChunks)

      // Sanity check: normalized output should be at least 30% the size of input.
      // If it's tiny, something went wrong and we got an error response instead of audio.
      if (output.length < inputBuffer.length * 0.3) {
        return resolve({ buffer: inputBuffer, normalized: false, reason: 'output suspiciously small' })
      }

      resolve({ buffer: output, normalized: true })
    })

    ff.stdin.write(inputBuffer)
    ff.stdin.end()
  })
}

module.exports = { normalizeLoudness, FFMPEG_AVAILABLE }
