const express = require('express')
const { z } = require('zod')
const OpenAI = require('openai')
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

const generateAudioSchema = z.object({
  text: z.string().min(1).max(5000),
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
      max_tokens: 1200,
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

    const titleMatch = storyText.match(/^(.+)\n/)
    const title = titleMatch
      ? titleMatch[1].replace(/^#\s*/, '').trim()
      : `${childDetails.name}'s ${result.template.name}`

    log('STORY', `Done! Title: "${title}" (${elapsed}ms total)`)

    return res.json({
      success: true,
      title,
      storyText,
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
 * Takes story text, sends it to ElevenLabs TTS, and streams the
 * resulting MP3 audio directly back to the client without buffering
 * the full file in server memory.
 */
router.post('/generate-audio', validate(generateAudioSchema), async (req, res) => {
  const startTime = Date.now()

  try {
    const { text } = req.validated
    const { elevenlabsApiKey, elevenlabsVoiceId } = req.app.locals.config

    log('AUDIO', '--- New audio request ---')
    log('AUDIO', `Text length: ${text.length} chars, Voice ID: ${elevenlabsVoiceId}`)
    log('AUDIO', 'Calling ElevenLabs (eleven_multilingual_v2)...')

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
      return res.status(502).json({
        success: false,
        error: 'Failed to generate audio. Please try again.',
      })
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

module.exports = router
