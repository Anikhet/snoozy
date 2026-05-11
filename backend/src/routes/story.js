const express = require('express')
const crypto = require('crypto')
const zlib = require('zlib')
const { spawn } = require('child_process')
const { writeFile, readFile, unlink } = require('fs/promises')
const { tmpdir } = require('os')
const path = require('path')
const { z } = require('zod')
const multer = require('multer')
const { AzureOpenAI } = require('openai')
const { validate } = require('../middleware/validate')
const { buildPrompt, WORLDS, VIBES, RECOMMENDED_API_SETTINGS, VIBE_VOICE_OVERRIDES } = require('../prompts/templates')
const { prepareTextForTTS, prepareTextForFishAudio } = require('../utils/ttsPreprocessor')
const { normalizeLoudness, FFMPEG_AVAILABLE } = require('../utils/audioNormalizer')

const { LRUCache } = require('lru-cache')

const router = express.Router()

// Multer: store uploaded audio in memory (max 20 MB — enough for ~3 min uncompressed)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/webm', 'audio/ogg', 'video/webm']
    if (allowed.includes(file.mimetype)) return cb(null, true)
    cb(new Error(`Unsupported audio type: ${file.mimetype}`))
  },
})

const ELEVENLABS_FALLBACK_VOICE = '21m00Tcm4TlvDq8ikWAM' // Rachel — used only if client sends no voiceId

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO CACHE
// Prevents regenerating identical audio on every story view.
// A 700-word story costs ~$0.07 on ElevenLabs v2. Caching pays for itself fast.
//
// Cache key: SHA-256 of (text + voiceId) — same text + different voice = different cache entry.
// In-memory for now. Swap for Redis when you hit scale (>500 stories/day).
// ─────────────────────────────────────────────────────────────────────────────

const audioCache = new LRUCache({
  max: 200,
  ttl: 2 * 60 * 60 * 1000, // 2 hours — entries expire regardless of access
})

// Deduplicates concurrent requests for the same cache key so only one TTS
// call goes out even if two requests arrive simultaneously for the same audio.
const inFlight = new Map() // key -> Promise<Buffer>

function getCacheKey(text, voiceId) {
  return crypto.createHash('sha256').update(`${text}:${voiceId}`).digest('hex')
}

function getFromCache(key) {
  return audioCache.get(key) ?? null
}

function setInCache(key, buffer) {
  audioCache.set(key, buffer)
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const validWorldIds = WORLDS.map((w) => w.id)
const validVibeIds = VIBES.map((v) => v.id)

const generateStorySchema = z.object({
  worldId: z.enum(validWorldIds).optional().default('forest'),
  vibeId:  z.enum(validVibeIds).optional().default('cozy'),
  childDetails: z.object({
    name:     z.string().min(1).max(50),
    age:      z.number().int().min(1).max(10),
    pronouns: z.enum(['he/him', 'she/her', 'they/them']).optional().default('they/them'),
  }),
})

const generateAudioSchema = z.object({
  text:     z.string().min(1).max(10000),
  voiceId:  z.string().min(1).max(100).optional(),
  provider: z.enum(['elevenlabs', 'fishaudio', 'azure']),
  vibeId:   z.enum(validVibeIds).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// LOGGER
// ─────────────────────────────────────────────────────────────────────────────

function log(step, message, data) {
  const timestamp = new Date().toISOString().slice(11, 23)
  const prefix = `[${timestamp}] [${step}]`
  if (data !== undefined) {
    console.log(prefix, message, typeof data === 'object' ? JSON.stringify(data) : data)
  } else {
    console.log(prefix, message)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/generate-story
 */
router.post('/generate-story', validate(generateStorySchema), async (req, res) => {
  const startTime = Date.now()

  try {
    const { worldId, vibeId, childDetails } = req.validated
    log('STORY', '--- New story request ---')
    log('STORY', `World: ${worldId}, Vibe: ${vibeId}, Child: ${childDetails.name}, Age: ${childDetails.age}`)

    const result = buildPrompt(worldId, vibeId, { name: childDetails.name, age: childDetails.age, pronouns: childDetails.pronouns })
    if (!result) {
      log('STORY', 'ERROR: Invalid world/vibe ID', { worldId, vibeId })
      return res.status(400).json({ success: false, error: 'Invalid world or vibe' })
    }
    log('STORY', 'Prompt built successfully')

    const config = req.app.locals.config

    log('STORY', `Calling Azure OpenAI (${config.azureOpenAIChatDeployment})...`)
    const client = new AzureOpenAI({
      apiKey:     config.azureOpenAIApiKey,
      endpoint:   config.azureOpenAIEndpoint,
      apiVersion: config.azureOpenAIChatVersion,
      deployment: config.azureOpenAIChatDeployment,
    })

    const { systemPrompt, userMessage } = result

    const completion = await client.chat.completions.create({
      model: config.azureOpenAIChatDeployment,
      temperature:       RECOMMENDED_API_SETTINGS.temperature,
      max_tokens:        RECOMMENDED_API_SETTINGS.max_tokens,
      presence_penalty:  RECOMMENDED_API_SETTINGS.presence_penalty,
      frequency_penalty: RECOMMENDED_API_SETTINGS.frequency_penalty,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
    })

    const elapsed   = Date.now() - startTime
    const storyText = completion.choices[0]?.message?.content

    if (!storyText) {
      log('STORY', `ERROR: No content in OpenAI response (${elapsed}ms)`)
      return res.status(500).json({ success: false, error: 'No story generated' })
    }

    const tokens = completion.usage
    log('STORY', `OpenAI responded in ${elapsed}ms`, {
      promptTokens:     tokens?.prompt_tokens,
      completionTokens: tokens?.completion_tokens,
      storyLength:      storyText.length,
    })

    const lines     = storyText.split('\n').filter((l) => l.trim().length > 0)
    const firstLine = lines[0]?.replace(/^#+\s*/, '').replace(/^\*+|\*+$/g, '').trim()
    const hasTitle  = firstLine && firstLine.length < 80
    const title     = hasTitle ? firstLine : `${childDetails.name}'s ${result.world.name} Story`
    const storyBody = hasTitle ? lines.slice(1).join('\n').trim() : storyText.trim()

    log('STORY', `Done! Title: "${title}", Body: ${storyBody.length} chars (${elapsed}ms total)`)

    return res.json({ success: true, title, storyText: storyBody })
  } catch (error) {
    const elapsed = Date.now() - startTime
    log('STORY', `FAILED after ${elapsed}ms: ${error.message}`)
    if (error.response) log('STORY', 'API response status:', error.response.status)
    return res.status(500).json({ success: false, error: 'Failed to generate story. Please try again.' })
  }
})

/**
 * POST /api/generate-audio
 *
 * Generates TTS audio via the configured provider (ElevenLabs or Fish Audio).
 * ElevenLabs path: resolves voice from explicit voiceId → region default → global fallback.
 * Results are cached by content hash to avoid re-generating identical audio.
 */
router.post('/generate-audio', validate(generateAudioSchema), async (req, res) => {
  const startTime = Date.now()
  const config    = req.app.locals.config

  try {
    const { text, voiceId, provider, vibeId } = req.validated

    log('AUDIO', '--- New audio request ---')
    log('AUDIO', `Text: ${text.length} chars | Provider: ${provider} | Voice: ${voiceId || 'default'} | Vibe: ${vibeId || 'n/a'}`)

    if (provider === 'elevenlabs') {
      await generateWithElevenLabs(text, voiceId, vibeId, config, res, startTime)
    } else if (provider === 'azure') {
      await generateWithAzureTTS(text, voiceId, vibeId, config, res, startTime)
    } else {
      await generateWithFishAudio(text, voiceId, vibeId, config, res, startTime)
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    log('AUDIO', `FAILED after ${elapsed}ms: ${error.message}`)
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'Failed to generate audio. Please try again.' })
    }
    res.end()
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// ELEVENLABS TTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates audio via ElevenLabs Multilingual v2.
 * Applies bedtime-optimised voice settings. Caches output by content hash.
 *
 * Voice settings rationale (do not adjust without testing):
 *   stability: 0.75     — consistent delivery, never robotic
 *   similarity_boost: 0.75 — faithful to the source voice character
 *   style: 0.12         — very low; keeps tone warm not theatrical (0.4 was too dramatic for bedtime)
 *   use_speaker_boost   — cleaner, fuller sound on mobile speakers and earphones
 *   speed: 0.88         — slightly slower than natural speech; sleep-inducing pace
 *   output_format       — mp3_44100_128: high quality, reasonable mobile file size
 */
async function generateWithElevenLabs(text, requestedVoiceId, vibeId, config, res, startTime) {
  const voiceId = requestedVoiceId || config.elevenlabsVoiceId || ELEVENLABS_FALLBACK_VOICE
  log('AUDIO', `ElevenLabs voice: ${voiceId}`)

  const processedText = prepareTextForTTS(text, vibeId)
  log('AUDIO', `TTS pre-processor: ${text.length} chars → ${processedText.length} chars`)

  // Cache key uses processed text so vibe-specific break timings are part of the key
  const cacheKey    = getCacheKey(processedText, voiceId)
  const cachedAudio = getFromCache(cacheKey)
  if (cachedAudio) {
    log('AUDIO', `Cache HIT (${cacheKey.slice(0, 8)}…) — serving ${(cachedAudio.length / 1024).toFixed(1)}KB from cache`)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('X-Cache', 'HIT')
    res.end(cachedAudio)
    return
  }
  if (inFlight.has(cacheKey)) {
    log('AUDIO', `Cache MISS but in-flight (${cacheKey.slice(0, 8)}…) — piggybacking`)
    try {
      const buffer = await inFlight.get(cacheKey)
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('X-Cache', 'DEDUP')
      return res.end(buffer)
    } catch {
      return res.status(502).json({ success: false, error: 'Failed to generate audio. Please try again.' })
    }
  }
  let resolveDeferred, rejectDeferred
  const deferred = new Promise((resolve, reject) => { resolveDeferred = resolve; rejectDeferred = reject })
  inFlight.set(cacheKey, deferred)

  log('AUDIO', `Cache MISS — calling ElevenLabs API...`)

  // FIX #3: output_format passed as query param — this is the correct ElevenLabs pattern
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`

  const ttsResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key':   config.elevenlabsApiKey,
      'Content-Type': 'application/json',
      Accept:         'audio/mpeg',
    },
    body: JSON.stringify({
      text: processedText,
      model_id: 'eleven_multilingual_v2',
      enable_ssml_parsing: true,
      voice_settings: {
        ...{ stability: 0.75, style: 0.12 },
        ...(VIBE_VOICE_OVERRIDES[vibeId] ?? {}),
        similarity_boost:  0.75,
        use_speaker_boost: true,
      },
      // FIX #2: speed — slightly slower than natural for sleep-inducing delivery
      // Note: speed is a top-level param for ElevenLabs v2, not inside voice_settings
      speed: 0.88,
    }),
  })

  const apiElapsed = Date.now() - startTime

  // FIX #9: Provider-specific error handling — ElevenLabs returns meaningful status codes
  if (!ttsResponse.ok) {
    const errorBody = await ttsResponse.text()
    log('AUDIO', `ElevenLabs ERROR ${ttsResponse.status} (${apiElapsed}ms):`, errorBody)

    const statusMessages = {
      401: 'ElevenLabs API key is invalid or missing.',
      404: `ElevenLabs voice "${voiceId}" not found. Add it to your ElevenLabs account at elevenlabs.io/app/voice-lab.`,
      422: `ElevenLabs rejected the voice or text. Check voice ID "${voiceId}" is valid.`,
      429: 'ElevenLabs rate limit reached. Request queued or try again shortly.',
    }
    const message = statusMessages[ttsResponse.status] || 'Failed to generate audio. Please try again.'

    rejectDeferred(new Error(message))
    inFlight.delete(cacheKey)
    if (!res.headersSent) {
      res.status(ttsResponse.status === 429 ? 429 : 502).json({ success: false, error: message })
    }
    return
  }

  log('AUDIO', `ElevenLabs responded OK in ${apiElapsed}ms — buffering for cache...`)

  // Buffer the full response so we can cache it and send it
  // Trade-off: slightly higher memory vs being able to cache.
  // For a 700-word story, the MP3 is ~200–400KB — well within safe limits.
  const arrayBuffer = await ttsResponse.arrayBuffer()
  const rawBuffer   = Buffer.from(arrayBuffer)

  const { buffer, normalized, reason } = await normalizeLoudness(rawBuffer)
  if (normalized) {
    log('AUDIO', `Loudness normalized: ${(rawBuffer.length / 1024).toFixed(1)}KB → ${(buffer.length / 1024).toFixed(1)}KB`)
  } else {
    log('AUDIO', `Loudness normalization skipped (${reason}) — serving raw audio`)
  }

  resolveDeferred(buffer)
  inFlight.delete(cacheKey)
  setInCache(cacheKey, buffer)

  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('X-Cache', 'MISS')
  res.end(buffer)

  const totalElapsed = Date.now() - startTime
  log('AUDIO', `Done! Sent ${(buffer.length / 1024).toFixed(1)}KB in ${totalElapsed}ms (cached for next request)`)
}

// ─────────────────────────────────────────────────────────────────────────────
// AZURE OPENAI TTS
// Uses the Azure OpenAI audio/speech endpoint (same resource as chat).
// Deployment: tts-hd (configured via AZURE_OPENAI_TTS_DEPLOYMENT).
// Voices: alloy, echo, fable, nova, onyx, shimmer (OpenAI-compatible names).
// Applies the same bedtime FFmpeg post-processing as Fish Audio.
// ─────────────────────────────────────────────────────────────────────────────

const AZURE_TTS_VALID_VOICES = new Set(['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'])

async function generateWithAzureTTS(text, requestedVoiceId, vibeId, config, res, startTime) {
  const voice = AZURE_TTS_VALID_VOICES.has(requestedVoiceId) ? requestedVoiceId : 'shimmer'
  log('AUDIO', `Azure TTS voice: ${voice}`)

  const processedText = prepareTextForTTS(text, vibeId)
  log('AUDIO', `TTS pre-processor: ${text.length} chars → ${processedText.length} chars`)

  const cacheKey    = getCacheKey(processedText, `azure:${voice}`)
  const cachedAudio = getFromCache(cacheKey)
  if (cachedAudio) {
    log('AUDIO', `Cache HIT (${cacheKey.slice(0, 8)}…) — serving ${(cachedAudio.length / 1024).toFixed(1)}KB from cache`)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('X-Cache', 'HIT')
    return res.end(cachedAudio)
  }

  if (inFlight.has(cacheKey)) {
    log('AUDIO', `Cache MISS but in-flight (${cacheKey.slice(0, 8)}…) — piggybacking`)
    try {
      const buffer = await inFlight.get(cacheKey)
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('X-Cache', 'DEDUP')
      return res.end(buffer)
    } catch {
      return res.status(502).json({ success: false, error: 'Failed to generate audio. Please try again.' })
    }
  }

  let resolveDeferred, rejectDeferred
  const deferred = new Promise((resolve, reject) => { resolveDeferred = resolve; rejectDeferred = reject })
  inFlight.set(cacheKey, deferred)

  log('AUDIO', `Cache MISS — calling Azure OpenAI TTS (deployment: ${config.azureOpenAITtsDeployment})...`)

  const client = new AzureOpenAI({
    apiKey:     config.azureOpenAIApiKey,
    endpoint:   config.azureOpenAIEndpoint,
    apiVersion: config.azureOpenAITtsVersion,
    deployment: config.azureOpenAITtsDeployment,
  })

  let ttsResponse
  try {
    ttsResponse = await client.audio.speech.create({
      model: config.azureOpenAITtsDeployment,
      input: processedText,
      voice,
      response_format: 'mp3',
      speed: 0.88,
    })
  } catch (err) {
    const apiElapsed = Date.now() - startTime
    log('AUDIO', `Azure TTS ERROR ${err.status ?? '?'} (${apiElapsed}ms):`, err.message)
    const statusMessages = {
      404: `Azure TTS deployment "${config.azureOpenAITtsDeployment}" not found. Check AZURE_OPENAI_TTS_DEPLOYMENT matches a deployed model in your Azure resource.`,
      401: 'Azure OpenAI API key is invalid or missing.',
      429: 'Azure TTS rate limit reached. Please try again shortly.',
    }
    const message = statusMessages[err.status] ?? 'Failed to generate audio. Please try again.'
    rejectDeferred(new Error(message))
    inFlight.delete(cacheKey)
    return res.status(err.status === 429 ? 429 : 502).json({ success: false, error: message })
  }

  const apiElapsed = Date.now() - startTime
  log('AUDIO', `Azure TTS responded OK in ${apiElapsed}ms — buffering for cache...`)

  const rawBuffer = Buffer.from(await ttsResponse.arrayBuffer())

  const { buffer, processed, reason } = await applyBedtimeProcessing(rawBuffer)
  log('AUDIO', `Bedtime processing: ${processed ? 'applied' : `skipped (${reason})`}`)

  resolveDeferred(buffer)
  inFlight.delete(cacheKey)
  setInCache(cacheKey, buffer)

  const totalElapsed = Date.now() - startTime
  log('AUDIO', `Done! Sent ${(buffer.length / 1024).toFixed(1)}KB in ${totalElapsed}ms (cached for next request)`)

  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('X-Cache', 'MISS')
  res.end(buffer)
}

// ─────────────────────────────────────────────────────────────────────────────
// FISH AUDIO TTS
// Uses s2-pro model with emotion tags for bedtime-optimised narration.
// Built-in loudness normalisation (normalize_loudness: true) removes FFmpeg dependency.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bedtime audio post-processing pipeline (single FFmpeg pass):
 *   1. Slows the final 25% by atempo=0.92 (sleep ending winds down)
 *   2. Crossfades at the split point (0.5s) to avoid a hard cut
 *   3. Gentle lowpass at 12kHz for warmth, fade in/out
 *
 * Falls back to raw buffer on any failure.
 */
const FFMPEG_BIN  = process.env.FFMPEG_PATH  || 'ffmpeg'
const FFPROBE_BIN = process.env.FFPROBE_PATH || 'ffprobe'
const BEDTIME_TIMEOUT_MS = 15_000

async function probeBedtimeDuration(filePath) {
  return new Promise((resolve, reject) => {
    const ff = spawn(FFPROBE_BIN, [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      filePath,
    ])
    let out = ''
    ff.stdout.on('data', (chunk) => { out += chunk })
    ff.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exit ${code}`))
      const d = parseFloat(out.trim())
      if (isNaN(d) || d <= 0) return reject(new Error('could not parse duration'))
      resolve(d)
    })
    ff.on('error', reject)
  })
}

async function applyBedtimeProcessing(inputBuffer) {
  if (!FFMPEG_AVAILABLE) {
    return { buffer: inputBuffer, processed: false, reason: 'ffmpeg not found' }
  }

  const id         = Date.now()
  const inputPath  = path.join(tmpdir(), `snoozy_raw_${id}.mp3`)
  const outputPath = path.join(tmpdir(), `snoozy_out_${id}.mp3`)

  try {
    await writeFile(inputPath, inputBuffer)

    const duration = await probeBedtimeDuration(inputPath)

    const splitPoint   = (duration * 0.75).toFixed(3)
    const fadeOutStart = Math.max(0, duration - 4.0).toFixed(3)

    const filterComplex = [
      `[0:a]atrim=0:${splitPoint},asetpts=PTS-STARTPTS[early]`,
      `[0:a]atrim=${splitPoint},asetpts=PTS-STARTPTS,atempo=0.92[late]`,
      `[early][late]acrossfade=d=0.5[joined]`,
      `[joined]dynaudnorm=p=0.71:m=10:s=12:g=15,lowpass=f=12000,afade=t=in:st=0:d=0.5,afade=t=out:st=${fadeOutStart}:d=4.0`,
    ].join(';')

    await new Promise((resolve, reject) => {
      let timedOut = false
      const ff = spawn(FFMPEG_BIN, [
        '-i', inputPath,
        '-filter_complex', filterComplex,
        '-b:a', '192k',
        '-y', outputPath,
      ])

      const timer = setTimeout(() => {
        timedOut = true
        ff.kill('SIGKILL')
        reject(new Error('bedtime processing timeout'))
      }, BEDTIME_TIMEOUT_MS)

      const stderrChunks = []
      ff.stderr.on('data', (chunk) => stderrChunks.push(chunk))

      ff.on('close', (code) => {
        clearTimeout(timer)
        if (timedOut) return
        if (code !== 0) {
          return reject(new Error(`ffmpeg exit ${code}: ${Buffer.concat(stderrChunks).toString().slice(-300)}`))
        }
        resolve()
      })
      ff.on('error', reject)
    })

    const output = await readFile(outputPath)
    if (output.length < inputBuffer.length * 0.3) {
      return { buffer: inputBuffer, processed: false, reason: 'output suspiciously small' }
    }

    return { buffer: output, processed: true }
  } catch (err) {
    return { buffer: inputBuffer, processed: false, reason: err.message }
  } finally {
    await Promise.all([
      unlink(inputPath).catch(() => {}),
      unlink(outputPath).catch(() => {}),
    ])
  }
}

async function generateWithFishAudio(text, requestedVoiceId, _vibeId, config, res, startTime) {
  const { text: processedText, warnings, stripped } = prepareTextForFishAudio(text)
  log('AUDIO', `Fish Audio pre-processor: ${text.length} chars → ${processedText.length} chars`)
  if (warnings.length > 0) {
    log('AUDIO', `Tag sanitizer: stripped [${stripped.join(', ')}]`)
  }

  const referenceId = requestedVoiceId || config.fishAudioVoiceId

  const cacheKey    = getCacheKey(processedText, referenceId || 'default')
  const cachedAudio = getFromCache(cacheKey)
  if (cachedAudio) {
    log('AUDIO', `Cache HIT (${cacheKey.slice(0, 8)}…) — serving ${(cachedAudio.length / 1024).toFixed(1)}KB from cache`)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('X-Cache', 'HIT')
    res.end(cachedAudio)
    return
  }
  if (inFlight.has(cacheKey)) {
    log('AUDIO', `Cache MISS but in-flight (${cacheKey.slice(0, 8)}…) — piggybacking`)
    try {
      const buffer = await inFlight.get(cacheKey)
      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('X-Cache', 'DEDUP')
      return res.end(buffer)
    } catch {
      return res.status(502).json({ success: false, error: 'Failed to generate audio. Please try again.' })
    }
  }
  let resolveDeferred, rejectDeferred
  const deferred = new Promise((resolve, reject) => { resolveDeferred = resolve; rejectDeferred = reject })
  inFlight.set(cacheKey, deferred)

  log('AUDIO', `Cache MISS — calling Fish Audio API (voice: ${referenceId || 'default'})...`)

  const body = {
    text: processedText,
    format: 'mp3',
    sample_rate: 44100,
    mp3_bitrate: 192,
    latency: 'normal',
    chunk_length: 300,
    min_chunk_length: 50,
    prosody: { speed: 0.92, volume: 0, normalize_loudness: true },
    temperature: 0.6,
    top_p: 0.7,
    repetition_penalty: 1.2,
    condition_on_previous_chunks: true,
    max_new_tokens: 1024,
    early_stop_threshold: 1,
    normalize: true,
  }
  if (referenceId) body.reference_id = referenceId

  const ttsResponse = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.fishApiKey}`,
      'Content-Type': 'application/json',
      'model': 's2-pro',
    },
    body: JSON.stringify(body),
  })

  const apiElapsed = Date.now() - startTime

  if (!ttsResponse.ok) {
    const errorBody = await ttsResponse.text()
    log('AUDIO', `Fish Audio ERROR ${ttsResponse.status} (${apiElapsed}ms):`, errorBody)

    const statusMessages = {
      401: 'Fish Audio API key is invalid or missing.',
      402: 'Fish Audio account has insufficient balance.',
      422: 'Fish Audio rejected the request. Check voice model ID and text.',
    }
    const message = statusMessages[ttsResponse.status] || 'Failed to generate audio. Please try again.'
    rejectDeferred(new Error(message))
    inFlight.delete(cacheKey)
    if (!res.headersSent) {
      res.status(ttsResponse.status === 402 ? 402 : 502).json({ success: false, error: message })
    }
    return
  }

  log('AUDIO', `Fish Audio responded OK in ${apiElapsed}ms — buffering for cache...`)

  const arrayBuffer = await ttsResponse.arrayBuffer()
  const rawBuffer   = Buffer.from(arrayBuffer)

  const { buffer, processed, reason } = await applyBedtimeProcessing(rawBuffer)
  log('AUDIO', `Bedtime processing: ${processed ? 'applied' : `skipped (${reason})`}`)

  resolveDeferred(buffer)
  inFlight.delete(cacheKey)
  setInCache(cacheKey, buffer)

  const totalElapsed = Date.now() - startTime
  log('AUDIO', `Done! Sent ${(buffer.length / 1024).toFixed(1)}KB in ${totalElapsed}ms`)

  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('X-Cache', 'MISS')
  res.end(buffer)
}

// ─────────────────────────────────────────────────────────────────────────────
// FISH AUDIO VOICE CLONING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a minimal valid PNG buffer (solid color, no external deps).
 * Used as a default cover image for public Fish Audio voice models.
 */
function createCoverPng(r = 91, g = 91, b = 214, size = 128) {
  function crc32(buf) {
    let c = 0xFFFFFFFF
    for (const byte of buf) {
      c = (c >>> 8) ^ CRC_TABLE[(c ^ byte) & 0xFF]
    }
    return (c ^ 0xFFFFFFFF) >>> 0
  }
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      t[n] = c
    }
    return t
  })()

  function chunk(type, data) {
    const tb = Buffer.from(type, 'ascii')
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0)
    return Buffer.concat([len, tb, data, crcBuf])
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2  // 8-bit RGB

  const scanline = Buffer.alloc(1 + size * 3)
  scanline[0] = 0
  for (let i = 0; i < size; i++) { scanline[1 + i*3] = r; scanline[2 + i*3] = g; scanline[3 + i*3] = b }
  const raw = Buffer.concat(Array.from({ length: size }, () => scanline))

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

const createVoiceCloneSchema = z.object({
  voiceName: z.string().min(1).max(100).optional(),
})

/**
 * POST /api/create-voice-clone
 *
 * Accepts a multipart audio upload, sends it to Fish Audio to create a private
 * voice clone model, and returns the model ID for use in future TTS calls.
 *
 * Form fields:
 *   audio     (file)    — WAV / MP3 / FLAC / WebM, 15–120 seconds recommended
 *   voiceName (string)  — optional display name, defaults to "My Voice"
 *
 * Response:
 *   { success: true, voiceModelId: string }
 */
router.post(
  '/create-voice-clone',
  audioUpload.single('audio'),
  (req, res, next) => {
    // Validate text fields via Zod after multer has parsed the multipart body
    const result = createVoiceCloneSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ success: false, error: 'Validation failed', details: result.error.issues })
    }
    req.validated = result.data
    next()
  },
  async (req, res) => {
    const startTime = Date.now()
    const config    = req.app.locals.config

    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No audio file uploaded. Send the file as form field "audio".' })
      }

      if (!config.fishApiKey) {
        return res.status(503).json({ success: false, error: 'Voice cloning requires Fish Audio. Set TTS_PROVIDER=fishaudio and FISH_API_KEY.' })
      }

      const voiceName = req.validated.voiceName || 'My Voice'
      log('VOICE', `Creating voice clone — name: "${voiceName}", file: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB, ${req.file.mimetype})`)

      const formData = new FormData()
      formData.append('type', 'tts')
      formData.append('title', voiceName)
      formData.append('train_mode', 'fast')
      formData.append('visibility', 'public')
      formData.append('cover_image', new Blob([createCoverPng()], { type: 'image/png' }), 'cover.png')
      formData.append(
        'voices',
        new Blob([req.file.buffer], { type: req.file.mimetype }),
        req.file.originalname,
      )

      const response = await fetch('https://api.fish.audio/model', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.fishApiKey}` },
        body: formData,
      })

      const apiElapsed = Date.now() - startTime

      if (!response.ok) {
        const errorBody = await response.text()
        log('VOICE', `Fish Audio ERROR ${response.status} (${apiElapsed}ms):`, errorBody)

        const statusMessages = {
          401: 'Fish Audio API key is invalid or missing.',
          402: 'Fish Audio account has insufficient balance.',
          422: 'Fish Audio rejected the audio. Ensure the file is a valid audio clip of at least 10 seconds.',
        }
        const message = statusMessages[response.status] || 'Failed to create voice clone. Please try again.'
        return res.status(response.status === 402 ? 402 : 502).json({ success: false, error: message })
      }

      const data = await response.json()
      const voiceModelId = data._id

      if (!voiceModelId) {
        log('VOICE', `Fish Audio response missing _id:`, JSON.stringify(data))
        return res.status(502).json({ success: false, error: 'Voice clone created but no model ID returned.' })
      }

      const totalElapsed = Date.now() - startTime
      log('VOICE', `Voice clone created: ${voiceModelId} (state: ${data.state}) in ${totalElapsed}ms`)

      return res.status(201).json({ success: true, voiceModelId, state: data.state })
    } catch (error) {
      const elapsed = Date.now() - startTime
      log('VOICE', `FAILED after ${elapsed}ms: ${error.message}`)
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: 'Failed to create voice clone. Please try again.' })
      }
    }
  },
)

/**
 * DELETE /api/voice-clone/:id
 *
 * Deletes a Fish Audio voice model. Call this when the user removes their
 * cloned voice or deletes their account.
 */
router.delete('/voice-clone/:id', async (req, res) => {
  const config = req.app.locals.config

  if (!config.fishApiKey) {
    return res.status(503).json({ success: false, error: 'Voice cloning requires Fish Audio. Set TTS_PROVIDER=fishaudio and FISH_API_KEY.' })
  }

  const { id } = req.params
  log('VOICE', `Deleting voice model: ${id}`)

  try {
    const response = await fetch(`https://api.fish.audio/model/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${config.fishApiKey}` },
    })

    if (!response.ok && response.status !== 404) {
      const errorBody = await response.text()
      log('VOICE', `Fish Audio DELETE ERROR ${response.status}:`, errorBody)
      return res.status(502).json({ success: false, error: 'Failed to delete voice model.' })
    }

    log('VOICE', `Voice model ${id} deleted`)
    return res.json({ success: true })
  } catch (error) {
    log('VOICE', `DELETE FAILED: ${error.message}`)
    return res.status(500).json({ success: false, error: 'Failed to delete voice model. Please try again.' })
  }
})

module.exports = router