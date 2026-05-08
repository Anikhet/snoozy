#!/usr/bin/env node
/**
 * Live Fish Audio TTS integration test.
 *
 * Verifies the full audio generation pipeline end-to-end:
 *   prepareTextForFishAudio → Fish Audio API (s2-pro) → MP3 output
 *
 * Checks:
 *   - Emotion tags are injected (not read literally by the API)
 *   - Audio file is returned and has a plausible size
 *   - Vibe-specific [soft] prefix is applied for cozy/kind vibes
 *
 * Usage:
 *   node tests/test-tts-fishaudio.js [vibeId]
 *   node tests/test-tts-fishaudio.js cozy
 *
 * Output: tests/tts-test-output-fishaudio.mp3  — listen to verify quality manually
 */

require('dotenv').config()
const fs   = require('fs')
const path = require('path')
const { prepareTextForFishAudio } = require('../src/utils/ttsPreprocessor')

const vibeId = process.argv[2] || 'cozy'

const VALID_VIBES = ['cozy', 'brave', 'kind', 'wonder', 'friends', 'inspired']
if (!VALID_VIBES.includes(vibeId)) {
  console.error(`Invalid vibe "${vibeId}". Valid: ${VALID_VIBES.join(', ')}`)
  process.exit(1)
}

// ─── Sample story — representative of real output ────────────────────────
// Same story used in the ElevenLabs test for easy A/B comparison

const SAMPLE_STORY = `The moon hung low over the Enchanted Forest — silver and still.

Priya stepped between the trees, her lantern casting a warm circle of gold on the mossy ground. The fireflies ahead seemed to know where she was going... even when she didn't.

Each tree she passed whispered a little secret into the quiet air. *Hmmm*, said the oldest oak, its bark smooth as river stone beneath her hand. The air smelled of pine and something sweeter — like rain that hadn't fallen yet.

At the heart of the forest she found what the fireflies had led her to: a single flower, white as a held breath, glowing faintly in the dark. She sat beside it and felt something settle inside her — a warmth that started in her chest and spread all the way to her fingertips.

She closed her eyes. The forest breathed around her. The flower hummed one low, steady note. And Priya, safe and held by all that softness, drifted down into sleep.`

async function main() {
  const apiKey     = process.env.FISH_API_KEY
  const referenceId = process.env.FISH_AUDIO_VOICE_ID  // optional

  if (!apiKey) {
    console.error('FISH_API_KEY not set in .env')
    process.exit(1)
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Vibe      : ${vibeId}`)
  console.log(`Voice ID  : ${referenceId || '(default — no reference_id)'}`)
  console.log(`Story     : ${SAMPLE_STORY.length} chars, ${SAMPLE_STORY.split(/\s+/).length} words`)
  console.log('─'.repeat(60))

  // ── Step 1: Pre-process ─────────────────────────────────────────────────
  console.log('\n[1] Running Fish Audio pre-processor...')
  const processedText = prepareTextForFishAudio(SAMPLE_STORY, vibeId)

  console.log(`    Input : ${SAMPLE_STORY.length} chars`)
  console.log(`    Output: ${processedText.length} chars`)
  console.log(`    [pause] tags    : ${(processedText.match(/\[pause\]/g) || []).length}`)
  console.log(`    [long pause] tags: ${(processedText.match(/\[long pause\]/g) || []).length}`)
  console.log(`    [soft] prefix   : ${processedText.startsWith('[soft]')}`)

  const hasRawEmDash   = processedText.includes('—') || processedText.includes('–')
  const hasRawEllipsis = /\.{3,}/.test(processedText)
  const hasMarkdown    = /\*[^*]+\*/.test(processedText)
  const hasSsmlTags    = /<break|<phoneme/.test(processedText)

  if (hasRawEmDash)   console.warn('    ⚠  WARNING: raw em-dash/en-dash found in processed text')
  if (hasRawEllipsis) console.warn('    ⚠  WARNING: raw 3-dot ellipsis found in processed text')
  if (hasMarkdown)    console.warn('    ⚠  WARNING: markdown asterisks found in processed text')
  if (hasSsmlTags)    console.warn('    ⚠  WARNING: SSML tags found — Fish Audio does not support these')

  if (!hasRawEmDash && !hasRawEllipsis && !hasMarkdown && !hasSsmlTags) {
    console.log('    ✓ Pre-processor output is clean')
  }

  console.log('\n    Pre-processed text preview (first 400 chars):')
  console.log('    ' + processedText.slice(0, 400).replace(/\n/g, '\n    '))

  // ── Step 2: Call Fish Audio ─────────────────────────────────────────────
  console.log('\n[2] Calling Fish Audio API (s2-pro)...')

  const body = {
    text: processedText,
    format: 'mp3',
    mp3_bitrate: 128,
    latency: 'normal',
    prosody: {
      speed: 0.9,
      normalize_loudness: true,
    },
    temperature: 0.7,
    condition_on_previous_chunks: true,
  }
  if (referenceId) body.reference_id = referenceId

  const startTime = Date.now()
  const response  = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'model': 's2-pro',
    },
    body: JSON.stringify(body),
  })

  const elapsed = Date.now() - startTime

  if (!response.ok) {
    const errBody = await response.text()
    console.error(`\n✗ Fish Audio error ${response.status} (${elapsed}ms):`)
    console.error(errBody)
    process.exit(1)
  }

  // ── Step 3: Validate response ───────────────────────────────────────────
  const contentType = response.headers.get('content-type') || ''
  console.log(`    Status       : ${response.status} OK (${elapsed}ms)`)
  console.log(`    Content-Type : ${contentType}`)

  const arrayBuffer = await response.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)
  const sizeKB      = (buffer.length / 1024).toFixed(1)
  console.log(`    Audio size   : ${sizeKB} KB`)

  if (buffer.length < 50_000) {
    console.error(`\n✗ Audio too small (${sizeKB} KB) — likely an error response read as audio`)
    process.exit(1)
  }

  // Verify it's a real MP3: ID3 header or sync bytes
  const magic = buffer.slice(0, 3).toString('hex')
  const isMP3 = magic.startsWith('494433') || magic.startsWith('fffb') || magic.startsWith('fff3')
  if (!isMP3) {
    console.error(`\n✗ Response does not look like an MP3 (magic bytes: ${magic})`)
    console.error('First 200 bytes as text:', buffer.slice(0, 200).toString('utf8'))
    process.exit(1)
  }

  // ── Step 4: Save output ─────────────────────────────────────────────────
  const outPath = path.join(__dirname, 'tts-test-output-fishaudio.mp3')
  fs.writeFileSync(outPath, buffer)
  console.log(`\n[3] Saved to: ${outPath}`)
  console.log('    Open this file and listen to verify:')
  console.log('      - No literal "[pause]" or "[long pause]" spoken')
  console.log('      - Audible pauses between paragraphs')
  console.log('      - Longer pause before final sentence(s)')
  console.log('      - Calm, gentle tone (especially for cozy/kind vibes)')

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`✓ Integration test passed — ${sizeKB} KB MP3 in ${elapsed}ms`)
}

main().catch((err) => {
  console.error('\n✗ Unexpected error:', err.message)
  process.exit(1)
})
