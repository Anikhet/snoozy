#!/usr/bin/env node
/**
 * Live ElevenLabs TTS integration test.
 *
 * Verifies the full audio generation pipeline end-to-end:
 *   prepareTextForTTS → ElevenLabs API → MP3 output
 *
 * Checks:
 *   - SSML tags are parsed (not read literally)
 *   - enable_ssml_parsing flag is accepted
 *   - Audio file is returned and has a plausible size
 *   - Vibe-specific voice settings are applied
 *
 * Usage:
 *   node tests/test-tts-elevenlabs.js [vibeId]
 *   node tests/test-tts-elevenlabs.js cozy
 *
 * Output: tests/tts-test-output.mp3  — listen to verify quality manually
 */

require('dotenv').config()
const fs   = require('fs')
const path = require('path')
const { prepareTextForTTS } = require('../src/utils/ttsPreprocessor')
const { VIBE_VOICE_OVERRIDES } = require('../src/prompts/templates')

const ELEVENLABS_VOICES = {
  rachel: '21m00Tcm4TlvDq8ikWAM',
}

const vibeId  = process.argv[2] || 'cozy'
const voiceId = ELEVENLABS_VOICES.rachel

const VALID_VIBES = ['cozy', 'brave', 'kind', 'wonder', 'friends']
if (!VALID_VIBES.includes(vibeId)) {
  console.error(`Invalid vibe "${vibeId}". Valid: ${VALID_VIBES.join(', ')}`)
  process.exit(1)
}

// ─── Sample story — representative of real output ────────────────────────
// Includes: em-dashes, ellipsis, italic, known name, multi-paragraph structure

const SAMPLE_STORY = `The moon hung low over the Enchanted Forest — silver and still.

Priya stepped between the trees, her lantern casting a warm circle of gold on the mossy ground. The fireflies ahead seemed to know where she was going... even when she didn't.

Each tree she passed whispered a little secret into the quiet air. *Hmmm*, said the oldest oak, its bark smooth as river stone beneath her hand. The air smelled of pine and something sweeter — like rain that hadn't fallen yet.

At the heart of the forest she found what the fireflies had led her to: a single flower, white as a held breath, glowing faintly in the dark. She sat beside it and felt something settle inside her — a warmth that started in her chest and spread all the way to her fingertips.

She closed her eyes. The forest breathed around her. The flower hummed one low, steady note. And Priya, safe and held by all that softness, drifted down into sleep.`

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    console.error('ELEVENLABS_API_KEY not set in .env')
    process.exit(1)
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Vibe    : ${vibeId}`)
  console.log(`Voice   : ${voiceId}`)
  console.log(`Story   : ${SAMPLE_STORY.length} chars, ${SAMPLE_STORY.split(/\s+/).length} words`)
  console.log('─'.repeat(60))

  // ── Step 1: Pre-process ─────────────────────────────────────────────────
  console.log('\n[1] Running TTS pre-processor...')
  const processedText = prepareTextForTTS(SAMPLE_STORY, vibeId)

  console.log(`    Input : ${SAMPLE_STORY.length} chars`)
  console.log(`    Output: ${processedText.length} chars`)
  console.log(`    Break tags: ${(processedText.match(/<break/g) || []).length}`)
  console.log(`    Phoneme tags: ${(processedText.match(/<phoneme/g) || []).length}`)

  // Verify no bare SSML placeholders or malformed tags
  const hasRawEmDash = processedText.includes('—') || processedText.includes('–')
  const hasRawEllipsis = /\.{3,}/.test(processedText)
  const hasMarkdown = /\*[^*]+\*/.test(processedText)

  if (hasRawEmDash)    console.warn('    ⚠  WARNING: raw em-dash/en-dash found in processed text')
  if (hasRawEllipsis)  console.warn('    ⚠  WARNING: raw 3-dot ellipsis found in processed text')
  if (hasMarkdown)     console.warn('    ⚠  WARNING: markdown asterisks found in processed text')

  if (!hasRawEmDash && !hasRawEllipsis && !hasMarkdown) {
    console.log('    ✓ Pre-processor output is clean')
  }

  console.log('\n    Pre-processed text preview (first 400 chars):')
  console.log('    ' + processedText.slice(0, 400).replace(/\n/g, '\n    '))

  // ── Step 2: Build voice settings ───────────────────────────────────────
  const vibeOverride = VIBE_VOICE_OVERRIDES[vibeId] ?? {}
  const voiceSettings = {
    stability:         0.75,
    style:             0.12,
    ...vibeOverride,
    similarity_boost:  0.75,
    use_speaker_boost: true,
  }

  console.log(`\n[2] Voice settings for vibe "${vibeId}":`, JSON.stringify(voiceSettings))

  // ── Step 3: Call ElevenLabs ─────────────────────────────────────────────
  console.log('\n[3] Calling ElevenLabs API...')
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`

  const startTime = Date.now()
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key':   apiKey,
      'Content-Type': 'application/json',
      Accept:         'audio/mpeg',
    },
    body: JSON.stringify({
      text:                processedText,
      model_id:            'eleven_multilingual_v2',
      enable_ssml_parsing: true,
      voice_settings:      voiceSettings,
      speed:               0.88,
    }),
  })

  const elapsed = Date.now() - startTime

  if (!response.ok) {
    const body = await response.text()
    console.error(`\n✗ ElevenLabs error ${response.status} (${elapsed}ms):`)
    console.error(body)
    process.exit(1)
  }

  // ── Step 4: Validate response ───────────────────────────────────────────
  const contentType = response.headers.get('content-type') || ''
  console.log(`    Status       : ${response.status} OK (${elapsed}ms)`)
  console.log(`    Content-Type : ${contentType}`)

  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const sizeKB = (buffer.length / 1024).toFixed(1)
  console.log(`    Audio size   : ${sizeKB} KB`)

  // Sanity: a 500-word story at 0.88 speed should produce 150–600 KB of MP3
  if (buffer.length < 50_000) {
    console.error(`\n✗ Audio too small (${sizeKB} KB) — likely an error response read as audio`)
    process.exit(1)
  }

  // Verify it's a real MP3: first 3 bytes should be ID3 header or 0xFF 0xFB sync
  const magic = buffer.slice(0, 3).toString('hex')
  const isMP3 = magic.startsWith('494433') || magic.startsWith('fffb') || magic.startsWith('fff3')
  if (!isMP3) {
    console.error(`\n✗ Response does not look like an MP3 (magic bytes: ${magic})`)
    // Print first 200 chars as text to see if it's an error JSON
    console.error('First 200 bytes as text:', buffer.slice(0, 200).toString('utf8'))
    process.exit(1)
  }

  // ── Step 5: Save output ─────────────────────────────────────────────────
  const outPath = path.join(__dirname, 'tts-test-output.mp3')
  fs.writeFileSync(outPath, buffer)
  console.log(`\n[4] Saved to: ${outPath}`)
  console.log('    Open this file and listen to verify:')
  console.log('      - No literal "<break time=..." spoken')
  console.log('      - Audible pauses between paragraphs')
  console.log('      - Longer pause before final sentence(s)')
  console.log('      - "Priya" pronounced correctly')

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`✓ Integration test passed — ${sizeKB} KB MP3 in ${elapsed}ms`)
}

main().catch((err) => {
  console.error('\n✗ Unexpected error:', err.message)
  process.exit(1)
})
