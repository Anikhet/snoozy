/**
 * Ambient audio generation script for Snoozy worlds.
 *
 * Uses ElevenLabs Sound Generation API (eleven_text_to_sound_v2) to produce
 * seamlessly-loopable MP3s for each story world. The app loops them natively
 * via ambientAudioService.ts — no server-side stitching needed.
 *
 * Usage:
 *   node scripts/generate-ambient.js           # all 6 worlds
 *   node scripts/generate-ambient.js forest    # one world only
 *   node scripts/generate-ambient.js space     # regenerate if unhappy with result
 *
 * Output:
 *   snoozy-android/assets/audio/ambient/ambient-{world}.mp3
 *   (exact filenames ambientAudioMap.ts expects)
 *
 * Post-processing (optional — applied automatically if ffmpeg is on PATH):
 *   brew install ffmpeg
 *   → −24 LUFS normalisation, 80 Hz high-pass, 6 kHz low-pass
 */

'use strict'

require('dotenv').config()

const fs   = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

// ─── Config ───────────────────────────────────────────────────────────────────

const API_KEY    = process.env.ELEVENLABS_API_KEY
const OUTPUT_DIR = path.resolve(__dirname, '../../snoozy-android/assets/audio/ambient')
const API_URL    = 'https://api.elevenlabs.io/v1/sound-generation'

// 22 s: varied enough to avoid a perceptible loop, reliable well below the 30 s cap,
// and small (~180 KB). The app's player.loop = true handles infinite looping.
const DURATION_SECONDS = 22

const RETRY_DELAY_MS = 5000  // wait before retrying a failed call
const WORLD_DELAY_MS = 3000  // polite gap between world generations

// ─── Prompts ─────────────────────────────────────────────────────────────────
//
// Prompt craft principles:
//  1. Sensory layers     — what you hear AND the physical feeling (warmth, weight)
//  2. Safety anchors     — every world has a "safe / protected / warm" phrase
//  3. Rhythm cues        — slow pulse language (~60 bpm) primes the brain for sleep
//  4. Explicit negatives — tells the model what to exclude (no crashes, no music)
//  5. Production framing — ends with "sustained ambient texture, sleep-inducing"
//                          to lock output into ambient mode, not SFX or music mode
//
// prompt_influence per world:
//  · 0.28 — space / clouds: more creative freedom → organic, ethereal textures
//  · 0.35 — forest / ocean / jungle: balanced, still natural
//  · 0.42 — kingdom: needs a literal fireplace; too vague and it adds music

const WORLDS = {
  forest: {
    name: 'Enchanted Forest',
    prompt: [
      'Ancient enchanted forest at deep night.',
      'Dense layered crickets forming a slow, soft, steady pulse.',
      'A single barn owl calling once from far in the distance — gentle, not startling.',
      'A barely-there breeze high in the canopy; leaves whispering, never rustling loudly.',
      'Warm, enveloping, timeless silence beneath the trees.',
      'No footsteps. No sudden animal sounds. Deeply calm.',
      'Protected by the old forest. Safe.',
      'Sustained ambient texture, sleep-inducing.',
    ].join(' '),
    promptInfluence: 0.35,
  },

  space: {
    name: 'Outer Space',
    prompt: [
      'Deep space ambient drone.',
      'Slow warm resonant hum as if distant stars are vibrating in soft harmony.',
      'Low harmonic sine tones that breathe and shift at a glacial pace.',
      'Vast soft silence between them — the universe exhaling.',
      'No sharp tones. No bleeps. No sci-fi sound effects. No melody.',
      'Weightless, timeless, infinite safety.',
      'The universe as a cradle. Deeply calming.',
      'Sustained cosmic ambient texture, sleep-inducing.',
    ].join(' '),
    promptInfluence: 0.28,
  },

  kingdom: {
    name: 'Magical Kingdom',
    prompt: [
      'Inside a grand fairytale stone castle at deep twilight.',
      'A large stone fireplace crackling slowly and steadily — warm, constant, never spitting.',
      'The deep resonance of old castle walls absorbing the heat.',
      'A very faint, faraway hum of gentle ancient magic drifting through stone corridors.',
      'No music. No melody. No voices. No footsteps.',
      'Completely enclosed. Warm. Safe behind ancient walls.',
      'Sustained ambient warmth, sleep-inducing.',
    ].join(' '),
    promptInfluence: 0.42,
  },

  ocean: {
    name: 'Ocean Deep',
    prompt: [
      'Warm shallow tropical ocean, heard from just beneath the surface.',
      'Slow deep underwater resonance — low, soft, like a lullaby from the sea itself.',
      'Soft continuous small bubbles rising at a leisurely, unhurried pace.',
      'Low submarine hum, the weight and warmth of water all around.',
      'No wave crashes. No splashing. No seabirds. Nothing sharp or sudden.',
      'Cradled by the warm ocean. Weightless and completely safe.',
      'Sustained underwater ambient texture, sleep-inducing.',
    ].join(' '),
    promptInfluence: 0.32,
  },

  clouds: {
    name: 'Cloud Kingdom',
    prompt: [
      'Floating high in soft white clouds above a sleeping world.',
      'Slow gentle high-altitude wind — airy and soft, like the sky slowly breathing.',
      'A faint distant harmonic wind-tone hum, the whole atmosphere exhaling.',
      'The whole sleeping world far below, tiny and quiet.',
      'No storm. No thunder. No rain. No sharp gusts. Nothing sudden.',
      'Weightless, peaceful, floating.',
      'Sustained sky ambient texture, sleep-inducing.',
    ].join(' '),
    promptInfluence: 0.28,
  },

  jungle: {
    name: 'Magical Safari',
    prompt: [
      'African savanna at deep dusk, the great herd settling for the night.',
      'Dense warm layer of cicadas and night insects at a slow, steady, gentle pulse.',
      'Soft warm wind moving slowly through tall dry grass.',
      'One very distant, low elephant rumble — far away, peaceful, reassuring.',
      'No predator sounds. No sudden animal calls. No drums.',
      'Warm, vast, ancient. Safe within the herd on the ancient plain.',
      'Sustained savanna night ambient texture, sleep-inducing.',
    ].join(' '),
    promptInfluence: 0.35,
  },
}

// ─── FFmpeg check ─────────────────────────────────────────────────────────────

const FFMPEG_AVAILABLE = spawnSync('ffmpeg', ['-version']).status === 0

if (!FFMPEG_AVAILABLE) {
  console.log('⚠  ffmpeg not found — files saved raw (no loudness normalisation).')
  console.log('   To enable post-processing: brew install ffmpeg\n')
}

// ─── API call ────────────────────────────────────────────────────────────────

async function callApi(worldId, worldDef, attempt) {
  console.log(`   API call (attempt ${attempt})…`)

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: worldDef.prompt,
      duration_seconds: DURATION_SECONDS,
      prompt_influence: worldDef.promptInfluence,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status} — ${body.slice(0, 200)}`)
  }

  const buf = Buffer.from(await res.arrayBuffer())
  console.log(`   Received ${(buf.length / 1024).toFixed(1)} KB`)
  return buf
}

// ─── FFmpeg post-processing ──────────────────────────────────────────────────
//
// Target spec matches ambientAudioMap.ts comment:
//   −24 LUFS (6 dB below narration's −18 LUFS)
//   LRA ≤ 4 (tight dynamics — nothing jumps out while falling asleep)
//   High-pass 80 Hz  — removes phone-speaker rumble
//   Low-pass 6000 Hz — cuts harsh highs, adds warmth

function postProcess(rawBuf, outputPath) {
  const tmpIn  = outputPath + '.raw.mp3'
  const tmpOut = outputPath + '.processed.mp3'

  fs.writeFileSync(tmpIn, rawBuf)

  const r = spawnSync('ffmpeg', [
    '-y',
    '-i', tmpIn,
    '-af', 'highpass=f=80,lowpass=f=6000,loudnorm=I=-24:LRA=4:TP=-2',
    '-ar', '44100',
    '-ac', '2',
    '-b:a', '128k',
    '-codec:a', 'libmp3lame',
    '-q:a', '2',
    tmpOut,
  ], { encoding: 'buffer' })

  fs.unlinkSync(tmpIn)

  if (r.status !== 0) {
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut)
    throw new Error(r.stderr?.toString().slice(-300) ?? 'ffmpeg failed')
  }

  const processed = fs.readFileSync(tmpOut)
  fs.unlinkSync(tmpOut)
  return processed
}

// ─── Per-world generation ────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function generateWorld(worldId) {
  const def = WORLDS[worldId]
  const outputPath = path.join(OUTPUT_DIR, `ambient-${worldId}.mp3`)

  console.log(`\n[${worldId}] ${def.name}`)
  console.log(`   prompt_influence: ${def.promptInfluence} | duration: ${DURATION_SECONDS}s`)
  console.log(`   "${def.prompt.slice(0, 90)}…"`)

  // Two attempts before giving up
  let raw
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      raw = await callApi(worldId, def, attempt)
      break
    } catch (err) {
      console.warn(`   ✗ Attempt ${attempt} failed: ${err.message}`)
      if (attempt === 2) {
        console.error(`   ✗ Skipping ${worldId} after 2 failed attempts.`)
        return false
      }
      console.log(`   Retrying in ${RETRY_DELAY_MS / 1000}s…`)
      await sleep(RETRY_DELAY_MS)
    }
  }

  // Post-process if ffmpeg is available
  let final = raw
  if (FFMPEG_AVAILABLE) {
    console.log('   Normalising (−24 LUFS, 80 Hz HP, 6 kHz LP)…')
    try {
      final = postProcess(raw, outputPath)
    } catch (err) {
      console.warn(`   ⚠  ffmpeg failed (${err.message.slice(0, 80)}) — saving raw`)
    }
  }

  fs.writeFileSync(outputPath, final)
  const rel = path.relative(path.resolve(__dirname, '../..'), outputPath)
  console.log(`   ✓ ${rel}  (${(final.length / 1024).toFixed(1)} KB)`)
  return true
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error('✗  ELEVENLABS_API_KEY not found in .env')
    process.exit(1)
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const arg     = process.argv[2]?.toLowerCase()
  const targets = arg ? [arg] : Object.keys(WORLDS)

  if (arg && !WORLDS[arg]) {
    console.error(`✗  Unknown world: "${arg}"`)
    console.error(`   Valid worlds: ${Object.keys(WORLDS).join(', ')}`)
    process.exit(1)
  }

  console.log(`\n🎵  Snoozy ambient generator`)
  console.log(`    Worlds  : ${targets.join(', ')}`)
  console.log(`    Duration: ${DURATION_SECONDS}s per clip`)
  console.log(`    Output  : ${OUTPUT_DIR}`)

  const ok = []
  const failed = []

  for (let i = 0; i < targets.length; i++) {
    const success = await generateWorld(targets[i])
    ;(success ? ok : failed).push(targets[i])

    if (i < targets.length - 1) {
      console.log(`\n   ⏳ Waiting ${WORLD_DELAY_MS / 1000}s…`)
      await sleep(WORLD_DELAY_MS)
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n── Results ──────────────────────────────────────────────────')
  if (ok.length)     console.log(`✓  Done    : ${ok.join(', ')}`)
  if (failed.length) console.log(`✗  Failed  : ${failed.join(', ')}`)

  if (ok.length > 0) {
    console.log('\nNext step — activate the files in:')
    console.log('  snoozy-android/src/config/ambientAudioMap.ts')
    console.log('\nFor each generated world, uncomment the require() line, e.g.:')
    ok.forEach((w) => {
      console.log(`  ${w}: require('../../assets/audio/ambient/ambient-${w}.mp3')`)
    })
  }

  console.log('')

  if (failed.length > 0) process.exit(1)
}

main().catch((err) => {
  console.error('\nFatal error:', err.message)
  process.exit(1)
})
