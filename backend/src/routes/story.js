const express = require('express')
const crypto = require('crypto')
const { z } = require('zod')
const multer = require('multer')
const OpenAI = require('openai')
const { AzureOpenAI } = OpenAI
const { validate } = require('../middleware/validate')
const { buildPrompt, WORLDS, VIBES, RECOMMENDED_API_SETTINGS, VIBE_VOICE_OVERRIDES } = require('../prompts/templates')
const { prepareTextForTTS, prepareTextForFishAudio } = require('../utils/ttsPreprocessor')
const { normalizeLoudness } = require('../utils/audioNormalizer')

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

// ─────────────────────────────────────────────────────────────────────────────
// ELEVENLABS VOICE REGISTRY
// Add voices here as you source them. Voice IDs are from ElevenLabs voice library.
// ─────────────────────────────────────────────────────────────────────────────

const ELEVENLABS_VOICES = {
  // --- USA ---
  rachel: '21m00Tcm4TlvDq8ikWAM',   // Neutral American female — warm, tested for long-form narration
  daniel: 'onwK4e9ZLuTAKqWW03F9',   // British male — bridges India + USA (shared)

  // --- India ---
  // TODO: Replace with sourced neutral Indian English female voice ID after testing.
  // Use ElevenLabs Voice Design: "Female, Indian English, neutral metro accent,
  // warm and calm, 30s, suitable for children's bedtime narration."
  meera: '21m00Tcm4TlvDq8ikWAM',    // Placeholder — using Rachel until Meera is sourced

  // --- Hindi (v2, not active yet) ---
  // sia:   '<voice_id>',             // Warm, intimate, bedtime storytelling in Hindi
  // viraj: '<voice_id>',             // Richly modulated, longform Hindi male
}

// Silent region defaults — Option 1 from our design discussion.
// Parent never sees a picker. We pre-select the right voice by region.
// Region codes must match what your auth/profile layer stores (ISO 3166-1 alpha-2).
const REGION_VOICE_DEFAULTS = {
  in: { female: ELEVENLABS_VOICES.meera,  male: ELEVENLABS_VOICES.daniel },
  us: { female: ELEVENLABS_VOICES.rachel, male: ELEVENLABS_VOICES.daniel },
  gb: { female: ELEVENLABS_VOICES.rachel, male: ELEVENLABS_VOICES.daniel },
  // Fallback for any unlisted region
  default: { female: ELEVENLABS_VOICES.rachel, male: ELEVENLABS_VOICES.daniel },
}

/**
 * Resolves the correct ElevenLabs voice ID for a user.
 *
 * Priority order:
 *   1. Explicit voiceId sent in the request (user has manually swapped via the story reader toggle)
 *   2. Region-based default from the user's profile (Option 1 — silent default)
 *   3. Global fallback (Rachel)
 *
 * @param {string|undefined} requestedVoiceId - Voice ID sent by the client, if any
 * @param {string|undefined} userRegion       - ISO region code from user profile (e.g. "in", "us")
 * @param {string}           gender           - "female" | "male", defaults to "female"
 */
function resolveElevenLabsVoice(requestedVoiceId, userRegion, gender = 'female') {
  if (requestedVoiceId) return requestedVoiceId

  const regionKey = (userRegion || '').toLowerCase()
  const regionDefaults = REGION_VOICE_DEFAULTS[regionKey] || REGION_VOICE_DEFAULTS.default
  return regionDefaults[gender] || ELEVENLABS_VOICES.rachel
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO CACHE
// Prevents regenerating identical audio on every story view.
// A 700-word story costs ~$0.07 on ElevenLabs v2. Caching pays for itself fast.
//
// Cache key: SHA-256 of (text + voiceId) — same text + different voice = different cache entry.
// In-memory for now. Swap for Redis when you hit scale (>500 stories/day).
// ─────────────────────────────────────────────────────────────────────────────

const audioCache = new Map()
const CACHE_MAX_ENTRIES = 200
const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

function getCacheKey(text, voiceId) {
  return crypto.createHash('sha256').update(`${text}:${voiceId}`).digest('hex')
}

function getFromCache(key) {
  const entry = audioCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    audioCache.delete(key)
    return null
  }
  return entry.buffer
}

function setInCache(key, buffer) {
  // Evict oldest entry if at capacity to keep memory bounded
  if (audioCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = audioCache.keys().next().value
    audioCache.delete(oldestKey)
  }
  audioCache.set(key, { buffer, timestamp: Date.now() })
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

// FIX #6: voice now accepts any non-empty string up to 100 chars.
// OpenAI voices (shimmer, nova…) and ElevenLabs voice IDs (21m00Tcm4TlvDq8ikWAM)
// are both plain strings — provider-specific validation happens inside each function.
// Also added: userRegion and gender for Option 1 silent region defaulting.
const generateAudioSchema = z.object({
  text:      z.string().min(1).max(10000),  // Raised to match ElevenLabs v2 limit
  voiceId:   z.string().min(1).max(100).optional(),  // ElevenLabs voice ID (explicit override)
  voice:     z.string().min(1).max(50).optional(),   // OpenAI/Azure voice name (shimmer, nova…)
  userRegion: z.string().length(2).optional(),       // ISO 3166-1 alpha-2 from user profile
  gender:    z.enum(['female', 'male']).optional().default('female'),
  vibeId:    z.enum(validVibeIds).optional(),        // drives per-vibe ElevenLabs voice settings
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
    let client
    let model

    if (config.ttsProvider === 'azure') {
      log('STORY', `Calling Azure OpenAI GPT (${config.azureOpenaiChatDeployment})...`)
      client = new AzureOpenAI({
        endpoint:   config.azureOpenaiEndpoint,
        apiKey:     config.azureOpenaiApiKey,
        apiVersion: config.azureOpenaiChatVersion,
        deployment: config.azureOpenaiChatDeployment,
      })
      model = config.azureOpenaiChatDeployment
    } else {
      log('STORY', `Calling Standard OpenAI (${RECOMMENDED_API_SETTINGS.model})...`)
      client = new OpenAI({ apiKey: config.openaiApiKey })
      model = RECOMMENDED_API_SETTINGS.model
    }

    const { systemPrompt, userMessage } = result

    const completion = await client.chat.completions.create({
      model,
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
 * Generates TTS audio via the configured provider (OpenAI, ElevenLabs, or Azure).
 * ElevenLabs path: resolves voice from explicit voiceId → region default → global fallback.
 * Results are cached by content hash to avoid re-generating identical audio.
 */
router.post('/generate-audio', validate(generateAudioSchema), async (req, res) => {
  const startTime = Date.now()
  const config    = req.app.locals.config

  try {
    // FIX #5: voice/voiceId/region are now destructured and passed to every provider function
    const { text, voiceId, voice, userRegion, gender, vibeId } = req.validated

    log('AUDIO', '--- New audio request ---')
    log('AUDIO', `Text: ${text.length} chars | Provider: ${config.ttsProvider} | Region: ${userRegion || 'n/a'} | Gender: ${gender} | Vibe: ${vibeId || 'n/a'}`)

    if (config.ttsProvider === 'elevenlabs') {
      await generateWithElevenLabs(text, voiceId, userRegion, gender, vibeId, config, res, startTime)
    } else if (config.ttsProvider === 'azure') {
      await generateWithAzure(text, config, res, startTime, voice)
    } else if (config.ttsProvider === 'fishaudio') {
      await generateWithFishAudio(text, voiceId, vibeId, config, res, startTime)
    } else {
      await generateWithOpenAI(text, config, res, startTime, voice)
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
async function generateWithElevenLabs(text, requestedVoiceId, userRegion, gender, vibeId, config, res, startTime) {
  const voiceId = resolveElevenLabsVoice(requestedVoiceId, userRegion, gender)
  log('AUDIO', `ElevenLabs voice resolved: ${voiceId} (requested: ${requestedVoiceId || 'none'}, region: ${userRegion || 'none'})`)

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
      422: `ElevenLabs rejected the voice or text. Check voice ID "${voiceId}" is valid.`,
      429: 'ElevenLabs rate limit reached. Request queued or try again shortly.',
    }
    const message = statusMessages[ttsResponse.status] || 'Failed to generate audio. Please try again.'

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

  setInCache(cacheKey, buffer)

  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('X-Cache', 'MISS')
  res.end(buffer)

  const totalElapsed = Date.now() - startTime
  log('AUDIO', `Done! Sent ${(buffer.length / 1024).toFixed(1)}KB in ${totalElapsed}ms (cached for next request)`)
}

// ─────────────────────────────────────────────────────────────────────────────
// OPENAI TTS — unchanged, kept for non-ElevenLabs environments
// ─────────────────────────────────────────────────────────────────────────────

async function generateWithOpenAI(text, config, res, startTime, requestedVoice) {
  const VALID_OPENAI_VOICES = ['shimmer', 'nova', 'onyx', 'fable', 'alloy', 'echo']
  const voice = VALID_OPENAI_VOICES.includes(requestedVoice) ? requestedVoice : (config.openaiTtsVoice || 'shimmer')
  log('AUDIO', `Calling OpenAI TTS (tts-1, voice: ${voice})...`)

  const openai = new OpenAI({ apiKey: config.openaiApiKey })

  const mp3Response = await openai.audio.speech.create({
    model:           'tts-1',
    voice,
    input:           text,
    response_format: 'mp3',
    speed:           0.95,
  })

  const apiElapsed = Date.now() - startTime
  log('AUDIO', `OpenAI TTS responded in ${apiElapsed}ms, sending audio...`)

  res.setHeader('Content-Type', 'audio/mpeg')

  const buffer = Buffer.from(await mp3Response.arrayBuffer())
  res.end(buffer)

  const totalElapsed = Date.now() - startTime
  log('AUDIO', `Done! Sent ${(buffer.length / 1024).toFixed(1)}KB in ${totalElapsed}ms`)
}

// ─────────────────────────────────────────────────────────────────────────────
// AZURE TTS — unchanged
// ─────────────────────────────────────────────────────────────────────────────

async function generateWithAzure(text, config, res, startTime, requestedVoice) {
  const voice    = requestedVoice || config.openaiTtsVoice
  const { azureOpenaiEndpoint, azureOpenaiApiKey, azureOpenaiApiVersion, azureOpenaiTtsDeployment } = config
  const url      = `${azureOpenaiEndpoint.replace(/\/+$/, '')}/openai/deployments/${azureOpenaiTtsDeployment}/audio/speech?api-version=${azureOpenaiApiVersion}`

  log('AUDIO', `Calling Azure OpenAI TTS: ${url}, voice: ${voice}`)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key':      azureOpenaiApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:           azureOpenaiTtsDeployment,
        input:           text,
        voice,
        response_format: 'mp3',
        speed:           0.95,
      }),
    })

    const apiElapsed = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      log('AUDIO', `Azure OpenAI FAILED (${response.status}) after ${apiElapsed}ms:`, errorText)
      throw new Error(`Azure OpenAI error ${response.status}: ${errorText}`)
    }

    log('AUDIO', `Azure OpenAI TTS responded in ${apiElapsed}ms, sending audio...`)

    res.setHeader('Content-Type', 'audio/mpeg')

    const arrayBuffer = await response.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)
    res.end(buffer)

    const totalElapsed = Date.now() - startTime
    log('AUDIO', `Done! Sent ${(buffer.length / 1024).toFixed(1)}KB in ${totalElapsed}ms`)
  } catch (error) {
    const elapsed = Date.now() - startTime
    log('AUDIO', `FAILED after ${elapsed}ms: ${error.message}`)
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: `Azure OpenAI TTS Failed: ${error.message}` })
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FISH AUDIO TTS
// Uses s2-pro model with emotion tags for bedtime-optimised narration.
// Built-in loudness normalisation (normalize_loudness: true) removes FFmpeg dependency.
// ─────────────────────────────────────────────────────────────────────────────

async function generateWithFishAudio(text, requestedVoiceId, vibeId, config, res, startTime) {
  const processedText = prepareTextForFishAudio(text, vibeId)
  log('AUDIO', `Fish Audio pre-processor: ${text.length} chars → ${processedText.length} chars`)

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
  log('AUDIO', `Cache MISS — calling Fish Audio API (voice: ${referenceId || 'default'})...`)

  const body = {
    text: processedText,
    format: 'mp3',
    sample_rate: 44100,
    mp3_bitrate: 192,
    latency: 'normal',
    chunk_length: 300,
    min_chunk_length: 50,
    prosody: { speed: 0.92, volume: 0 },
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
    if (!res.headersSent) {
      res.status(ttsResponse.status === 402 ? 402 : 502).json({ success: false, error: message })
    }
    return
  }

  log('AUDIO', `Fish Audio responded OK in ${apiElapsed}ms — buffering for cache...`)

  const arrayBuffer = await ttsResponse.arrayBuffer()
  const rawBuffer   = Buffer.from(arrayBuffer)

  const { buffer, normalized } = await normalizeLoudness(rawBuffer)
  log('AUDIO', `Loudness normalization: ${normalized ? 'applied' : 'skipped'}`)

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