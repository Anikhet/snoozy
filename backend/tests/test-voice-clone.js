#!/usr/bin/env node
/**
 * Live Fish Audio voice cloning integration test.
 *
 * Sends a real audio file to POST /model on Fish Audio and verifies
 * a voice model ID is returned. Then optionally deletes the model.
 *
 * Usage:
 *   node tests/test-voice-clone.js <path-to-audio-file> [voiceName]
 *   node tests/test-voice-clone.js ~/sample-voice.mp3
 *   node tests/test-voice-clone.js ~/sample-voice.mp3 "Test Voice"
 *
 * The test deletes the created model at the end to avoid accumulating test data.
 * Pass --keep to skip deletion:
 *   node tests/test-voice-clone.js ~/sample-voice.mp3 --keep
 */

require('dotenv').config()
const fs   = require('fs')
const path = require('path')

const args      = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const keep      = process.argv.includes('--keep')
const audioPath = args[0]
const voiceName = args[1] || 'Snoozy Test Voice'

if (!audioPath) {
  console.error('Usage: node tests/test-voice-clone.js <path-to-audio-file> [voiceName]')
  console.error('Example: node tests/test-voice-clone.js ~/sample-voice.mp3')
  process.exit(1)
}

const resolvedPath = audioPath.startsWith('~')
  ? path.join(process.env.HOME, audioPath.slice(1))
  : path.resolve(audioPath)

if (!fs.existsSync(resolvedPath)) {
  console.error(`Audio file not found: ${resolvedPath}`)
  process.exit(1)
}

const MIME_BY_EXT = {
  '.mp3':  'audio/mpeg',
  '.mp4':  'audio/mp4',
  '.m4a':  'audio/mp4',
  '.wav':  'audio/wav',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
  '.ogg':  'audio/ogg',
}

async function main() {
  const apiKey = process.env.FISH_API_KEY
  if (!apiKey) {
    console.error('FISH_API_KEY not set in .env')
    process.exit(1)
  }

  const ext      = path.extname(resolvedPath).toLowerCase()
  const mimeType = MIME_BY_EXT[ext] || 'audio/mpeg'
  const fileSize = fs.statSync(resolvedPath).size

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Audio file : ${resolvedPath}`)
  console.log(`MIME type  : ${mimeType}`)
  console.log(`File size  : ${(fileSize / 1024).toFixed(1)} KB`)
  console.log(`Voice name : ${voiceName}`)
  console.log('─'.repeat(60))

  // ── Step 1: Create voice model ──────────────────────────────────────────
  console.log('\n[1] Creating voice clone on Fish Audio...')

  const formData = new FormData()
  formData.append('type', 'tts')
  formData.append('title', voiceName)
  formData.append('train_mode', 'fast')
  formData.append('visibility', 'private')
  formData.append(
    'voices',
    new Blob([fs.readFileSync(resolvedPath)], { type: mimeType }),
    path.basename(resolvedPath),
  )

  const startTime = Date.now()
  const response  = await fetch('https://api.fish.audio/model', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  })

  const elapsed = Date.now() - startTime

  if (!response.ok) {
    const body = await response.text()
    console.error(`\n✗ Fish Audio error ${response.status} (${elapsed}ms):`)
    console.error(body)
    process.exit(1)
  }

  const data = await response.json()
  console.log(`    Status       : ${response.status} Created (${elapsed}ms)`)
  console.log(`    Voice model ID: ${data._id}`)
  console.log(`    State        : ${data.state}`)
  console.log(`    Title        : ${data.title}`)
  console.log(`    Visibility   : ${data.visibility}`)

  if (!data._id) {
    console.error('\n✗ No _id in response — cannot proceed')
    process.exit(1)
  }

  // ── Step 2: Quick TTS test with the new voice ───────────────────────────
  console.log('\n[2] Running quick TTS test with the new voice...')

  const ttsBody = {
    text: '[soft]Once upon a time, a little star blinked at the sleeping world below.[pause]And all was well.',
    reference_id: data._id,
    format: 'mp3',
    mp3_bitrate: 128,
    latency: 'normal',
    prosody: { speed: 0.9, normalize_loudness: true },
  }

  const ttsStart    = Date.now()
  const ttsResponse = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'model': 's2-pro',
    },
    body: JSON.stringify(ttsBody),
  })

  const ttsElapsed = Date.now() - ttsStart

  if (!ttsResponse.ok) {
    const errBody = await ttsResponse.text()
    console.warn(`    ⚠  TTS test failed ${ttsResponse.status} (${ttsElapsed}ms): ${errBody}`)
    console.warn('    (Voice model was created successfully — TTS failure may be transient)')
  } else {
    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer())
    const outPath     = path.join(__dirname, 'voice-clone-test-output.mp3')
    fs.writeFileSync(outPath, audioBuffer)
    console.log(`    Status    : ${ttsResponse.status} OK (${ttsElapsed}ms)`)
    console.log(`    Audio size: ${(audioBuffer.length / 1024).toFixed(1)} KB`)
    console.log(`    Saved to  : ${outPath}`)
    console.log('    Listen and verify the voice matches your recording.')
  }

  // ── Step 3: Cleanup ─────────────────────────────────────────────────────
  if (keep) {
    console.log(`\n[3] Keeping voice model ${data._id} (--keep flag set)`)
    console.log(`    Save this ID as FISH_AUDIO_VOICE_ID in your .env to use it for TTS.`)
  } else {
    console.log(`\n[3] Deleting test voice model ${data._id}...`)
    const delResponse = await fetch(`https://api.fish.audio/model/${data._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (delResponse.ok || delResponse.status === 404) {
      console.log('    ✓ Deleted')
    } else {
      console.warn(`    ⚠  Delete failed (${delResponse.status}) — clean up manually`)
    }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`✓ Voice clone test passed in ${Date.now() - startTime}ms`)
  if (keep) console.log(`  Voice model ID: ${data._id}`)
}

main().catch((err) => {
  console.error('\n✗ Unexpected error:', err.message)
  process.exit(1)
})
