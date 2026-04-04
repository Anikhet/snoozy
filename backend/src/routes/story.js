const express = require('express')
const { z } = require('zod')
const OpenAI = require('openai')
const { AzureOpenAI } = OpenAI
const { validate } = require('../middleware/validate')
const { buildPrompt, templates } = require('../prompts/templates')

const router = express.Router()

const validTemplateIds = templates.map((t) => t.id)

const generateStorySchema = z.object({
  templateId: z.enum(validTemplateIds),
  childDetails: z.object({
    name: z.string().min(1).max(50),
    age: z.number().int().min(1).max(10),
    favoriteColor: z.string().max(30).optional(),
    favoriteAnimal: z.string().max(30).optional(),
    favoriteThing: z.string().max(50).optional(),
  }),
})

const VALID_VOICES = ['shimmer', 'nova', 'onyx', 'fable']

const generateAudioSchema = z.object({
  text: z.string().min(1).max(5000),
  voice: z.enum(VALID_VOICES).optional(),
})

/** Prefixed logger for clear step-by-step visibility. */
function log(step, message, data) {
  const timestamp = new Date().toISOString().slice(11, 23)
  const prefix = `[${timestamp}] [${step}]`
  if (data !== undefined) {
    console.log(prefix, message, typeof data === 'object' ? JSON.stringify(data) : data)
  } else {
    console.log(prefix, message)
  }
}

/**
 * POST /api/generate-story
 *
 * Takes a templateId and childDetails, builds a prompt from the template,
 * calls OpenAI to generate a personalized bedtime story, and returns
 * { success, title, storyText }.
 */
router.post('/generate-story', validate(generateStorySchema), async (req, res) => {
  const startTime = Date.now()

  try {
    const { templateId, childDetails } = req.validated
    log('STORY', '--- New story request ---')
    log('STORY', `Template: ${templateId}, Child: ${childDetails.name}, Age: ${childDetails.age}`)

    const result = buildPrompt(templateId, childDetails)
    if (!result) {
      log('STORY', 'ERROR: Invalid template ID', templateId)
      return res.status(400).json({ success: false, error: 'Invalid template' })
    }
    log('STORY', 'Prompt built successfully')

    log('STORY', 'Calling OpenAI (gpt-4o-mini)...')
    const openai = new OpenAI({ apiKey: req.app.locals.config.openaiApiKey })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 800,
      messages: [
        { role: 'system', content: result.prompt },
        {
          role: 'user',
          content: `Please write a bedtime story for ${childDetails.name}. Remember to keep it gentle and calming.`,
        },
      ],
    })

    const elapsed = Date.now() - startTime
    const storyText = completion.choices[0]?.message?.content

    if (!storyText) {
      log('STORY', `ERROR: No content in OpenAI response (${elapsed}ms)`)
      return res.status(500).json({ success: false, error: 'No story generated' })
    }

    const tokens = completion.usage
    log('STORY', `OpenAI responded in ${elapsed}ms`, {
      promptTokens: tokens?.prompt_tokens,
      completionTokens: tokens?.completion_tokens,
      storyLength: storyText.length,
    })

    const lines = storyText.split('\n').filter((l) => l.trim().length > 0)
    const firstLine = lines[0]?.replace(/^#+\s*/, '').replace(/^\*+|\*+$/g, '').trim()

    // If first line is short enough to be a title (under 80 chars), use it and strip from body
    const hasTitle = firstLine && firstLine.length < 80
    const title = hasTitle ? firstLine : `${childDetails.name}'s ${result.template.name}`
    const storyBody = hasTitle ? lines.slice(1).join('\n').trim() : storyText.trim()

    log('STORY', `Done! Title: "${title}", Body: ${storyBody.length} chars (${elapsed}ms total)`)

    return res.json({
      success: true,
      title,
      storyText: storyBody,
    })
  } catch (error) {
    const elapsed = Date.now() - startTime
    log('STORY', `FAILED after ${elapsed}ms: ${error.message}`)
    if (error.response) {
      log('STORY', 'API response status:', error.response.status)
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to generate story. Please try again.',
    })
  }
})

/**
 * POST /api/generate-audio
 *
 * Takes story text and generates TTS audio via the configured provider
 * (OpenAI or ElevenLabs). Streams the MP3 response directly to the client.
 *
 * Set TTS_PROVIDER=elevenlabs in .env to use ElevenLabs instead of OpenAI.
 */
router.post('/generate-audio', validate(generateAudioSchema), async (req, res) => {
  const startTime = Date.now()
  const config = req.app.locals.config

  try {
    const { text, voice } = req.validated

    log('AUDIO', '--- New audio request ---')
    log('AUDIO', `Text length: ${text.length} chars, Provider: ${config.ttsProvider}, Voice: ${voice || 'default'}`)

    if (config.ttsProvider === 'elevenlabs') {
      await generateWithElevenLabs(text, config, res, startTime)
    } else if (config.ttsProvider === 'azure') {
      await generateWithAzure(text, config, res, startTime, voice)
    } else {
      await generateWithOpenAI(text, config, res, startTime, voice)
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    log('AUDIO', `FAILED after ${elapsed}ms: ${error.message}`)
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate audio. Please try again.',
      })
    }
    res.end()
  }
})

// ── OpenAI TTS ──────────────────────────────────────────────────

async function generateWithOpenAI(text, config, res, startTime, requestedVoice) {
  const voice = requestedVoice || config.openaiTtsVoice
  log('AUDIO', `Calling OpenAI TTS (tts-1, voice: ${voice})...`)

  const openai = new OpenAI({ apiKey: config.openaiApiKey })

  const mp3Response = await openai.audio.speech.create({
    model: 'tts-1',
    voice,
    input: text,
    response_format: 'mp3',
    speed: 0.95,
  })

  const apiElapsed = Date.now() - startTime
  log('AUDIO', `OpenAI TTS responded in ${apiElapsed}ms, streaming audio...`)

  res.setHeader('Content-Type', 'audio/mpeg')

  const buffer = Buffer.from(await mp3Response.arrayBuffer())
  res.end(buffer)

  const totalElapsed = Date.now() - startTime
  log('AUDIO', `Done! Sent ${(buffer.length / 1024).toFixed(1)}KB in ${totalElapsed}ms`)
}

// ── ElevenLabs TTS (for future use with paid plan) ─────────────

async function generateWithElevenLabs(text, config, res, startTime) {
  const { elevenlabsApiKey, elevenlabsVoiceId } = config
  log('AUDIO', `Calling ElevenLabs (eleven_multilingual_v2, voice: ${elevenlabsVoiceId})...`)

  const ttsResponse = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${elevenlabsVoiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsApiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.4,
        },
      }),
    }
  )

  const apiElapsed = Date.now() - startTime

  if (!ttsResponse.ok) {
    const errorBody = await ttsResponse.text()
    log('AUDIO', `ElevenLabs ERROR ${ttsResponse.status} (${apiElapsed}ms):`, errorBody)
    res.status(502).json({
      success: false,
      error: 'Failed to generate audio. Please try again.',
    })
    return
  }

  log('AUDIO', `ElevenLabs responded OK in ${apiElapsed}ms, streaming audio...`)

  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Transfer-Encoding', 'chunked')

  let totalBytes = 0
  const reader = ttsResponse.body.getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.length
    res.write(value)
  }
  res.end()

  const totalElapsed = Date.now() - startTime
  log('AUDIO', `Done! Streamed ${(totalBytes / 1024).toFixed(1)}KB in ${totalElapsed}ms`)
}

// ── Azure OpenAI TTS ──────────────────────────────────────────

async function generateWithAzure(text, config, res, startTime, requestedVoice) {
  const voice = requestedVoice || config.openaiTtsVoice
  const { azureOpenaiEndpoint, azureOpenaiApiKey, azureOpenaiApiVersion, azureOpenaiTtsDeployment } = config

  // Standard Azure OpenAI TTS endpoint construction
  const url = `${azureOpenaiEndpoint.replace(/\/+$/, '')}/openai/deployments/${azureOpenaiTtsDeployment}/audio/speech?api-version=${azureOpenaiApiVersion}`

  log('AUDIO', `Calling Azure OpenAI TTS (fetch): ${url}`)
  log('AUDIO', `Using voice: ${voice}`)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'api-key': azureOpenaiApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: azureOpenaiTtsDeployment, // Mandatory for Azure
        input: text,
        voice: voice,
        response_format: 'mp3',
        speed: 0.95,
      }),
    })

    const apiElapsed = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      log('AUDIO', `Azure OpenAI FAILED (${response.status}) after ${apiElapsed}ms:`, errorText)
      throw new Error(`Azure OpenAI error ${response.status}: ${errorText}`)
    }

    log('AUDIO', `Azure OpenAI TTS responded in ${apiElapsed}ms, streaming audio...`)

    res.setHeader('Content-Type', 'audio/mpeg')

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    res.end(buffer)

    const totalElapsed = Date.now() - startTime
    log('AUDIO', `Done! Sent ${(buffer.length / 1024).toFixed(1)}KB in ${totalElapsed}ms`)
  } catch (error) {
    const elapsed = Date.now() - startTime
    log('AUDIO', `FAILED after ${elapsed}ms: ${error.message}`)
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: `Azure OpenAI TTS Failed: ${error.message}`,
      })
    }
  }
}

module.exports = router
