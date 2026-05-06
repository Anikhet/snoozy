#!/usr/bin/env node
/**
 * Story quality test script.
 * Usage: node test-story.js <worldId> <vibeId> <childName> <childAge> [pronouns]
 *
 * Worlds:   kingdom | forest | space | ocean | clouds | jungle
 * Vibes:    cozy | brave | kind | wonder | friends
 * Pronouns: he/him | she/her | they/them  (default: they/them)
 *
 * Example: node test-story.js forest cozy Aria 5 she/her
 */

require('dotenv').config()
const OpenAI = require('openai')
const { AzureOpenAI } = OpenAI
const { buildPrompt, RECOMMENDED_API_SETTINGS, WORLDS, VIBES } = require('./src/prompts/templates')

const [,, worldId = 'forest', vibeId = 'cozy', childName = 'Aria', childAgeRaw = '5', pronouns = 'they/them'] = process.argv
const childAge = parseInt(childAgeRaw, 10)

if (isNaN(childAge) || childAge < 1 || childAge > 10) {
  console.error('Age must be a number between 1 and 10.')
  process.exit(1)
}

const validWorldIds = WORLDS.map((w) => w.id)
const validVibeIds  = VIBES.map((v) => v.id)

if (!validWorldIds.includes(worldId)) {
  console.error(`Invalid worldId "${worldId}". Valid options: ${validWorldIds.join(', ')}`)
  process.exit(1)
}
if (!validVibeIds.includes(vibeId)) {
  console.error(`Invalid vibeId "${vibeId}". Valid options: ${validVibeIds.join(', ')}`)
  process.exit(1)
}

const validPronouns = ['he/him', 'she/her', 'they/them']
if (!validPronouns.includes(pronouns)) {
  console.error(`Invalid pronouns "${pronouns}". Valid options: ${validPronouns.join(', ')}`)
  process.exit(1)
}

async function main() {
  const result = buildPrompt(worldId, vibeId, { name: childName, age: childAge, pronouns })

  console.log('─'.repeat(60))
  console.log(`World    : ${result.world.name}`)
  console.log(`Vibe     : ${result.vibe.name}`)
  console.log(`Child    : ${childName}, age ${childAge}`)
  console.log(`Pronouns : ${pronouns}`)
  console.log('─'.repeat(60))
  console.log('Generating story...\n')

  const ttsProvider = (process.env.TTS_PROVIDER || 'openai').toLowerCase()
  const { systemPrompt, userMessage } = result

  let client, model
  if (ttsProvider === 'azure') {
    client = new AzureOpenAI({
      endpoint:   process.env.AZURE_OPENAI_ENDPOINT,
      apiKey:     process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_CHAT_VERSION || '2025-01-01-preview',
      deployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT,
    })
    model = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
  } else {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    model  = RECOMMENDED_API_SETTINGS.model
  }

  const completion = await client.chat.completions.create({
    model,
    temperature:       RECOMMENDED_API_SETTINGS.temperature,
    max_tokens:        RECOMMENDED_API_SETTINGS.max_tokens,
    presence_penalty:  RECOMMENDED_API_SETTINGS.presence_penalty,
    frequency_penalty: RECOMMENDED_API_SETTINGS.frequency_penalty,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
  })

  const storyText = completion.choices[0]?.message?.content
  if (!storyText) {
    console.error('No story returned from OpenAI.')
    process.exit(1)
  }

  const lines     = storyText.split('\n').filter((l) => l.trim().length > 0)
  const firstLine = lines[0]?.replace(/^#+\s*/, '').replace(/^\*+|\*+$/g, '').trim()
  const hasTitle  = firstLine && firstLine.length < 80
  const title     = hasTitle ? firstLine : `${childName}'s ${result.world.name} Story`
  const storyBody = hasTitle ? lines.slice(1).join('\n\n').trim() : storyText.trim()

  const usage = completion.usage
  console.log(`TITLE: ${title}`)
  console.log('─'.repeat(60))
  console.log(storyBody)
  console.log('─'.repeat(60))
  console.log(`Tokens — prompt: ${usage?.prompt_tokens}, completion: ${usage?.completion_tokens}`)
  console.log(`Words  — ~${storyBody.split(/\s+/).length}`)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
