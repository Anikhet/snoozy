#!/usr/bin/env node
/**
 * Story sanitization test script.
 * Generates a story via Azure OpenAI then runs it through the Fish Audio
 * preprocessor — showing raw output, sanitized output, and tag stats.
 *
 * Usage: node test-story-sanitized.js <worldId> <vibeId> <childName> <childAge> [pronouns]
 *
 * Worlds:   kingdom | forest | space | ocean | clouds | jungle
 * Vibes:    cozy | brave | kind | wonder | friends
 * Pronouns: he/him | she/her | they/them  (default: they/them)
 *
 * Example: node test-story-sanitized.js forest cozy Emma 5 she/her
 */

require('dotenv').config()
const { AzureOpenAI } = require('openai')
const { buildPrompt, RECOMMENDED_API_SETTINGS, WORLDS, VIBES } = require('./src/prompts/templates')
const { prepareTextForFishAudio, analyzeTagDensity } = require('./src/utils/ttsPreprocessor')

const [,, worldId = 'forest', vibeId = 'cozy', childName = 'Emma', childAgeRaw = '5', pronouns = 'they/them'] = process.argv
const childAge = parseInt(childAgeRaw, 10)

if (isNaN(childAge) || childAge < 1 || childAge > 10) {
  console.error('Age must be a number between 1 and 10.')
  process.exit(1)
}

const validWorldIds = WORLDS.map((w) => w.id)
const validVibeIds  = VIBES.map((v) => v.id)
const validPronouns = ['he/him', 'she/her', 'they/them']

if (!validWorldIds.includes(worldId)) {
  console.error(`Invalid worldId "${worldId}". Valid options: ${validWorldIds.join(', ')}`)
  process.exit(1)
}
if (!validVibeIds.includes(vibeId)) {
  console.error(`Invalid vibeId "${vibeId}". Valid options: ${validVibeIds.join(', ')}`)
  process.exit(1)
}
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

  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT
  const client = new AzureOpenAI({
    endpoint:   process.env.AZURE_OPENAI_ENDPOINT,
    apiKey:     process.env.AZURE_OPENAI_API_KEY,
    apiVersion: process.env.AZURE_OPENAI_CHAT_VERSION || '2025-01-01-preview',
    deployment,
  })

  const completion = await client.chat.completions.create({
    model:             deployment,
    temperature:       RECOMMENDED_API_SETTINGS.temperature,
    max_tokens:        RECOMMENDED_API_SETTINGS.max_tokens,
    presence_penalty:  RECOMMENDED_API_SETTINGS.presence_penalty,
    frequency_penalty: RECOMMENDED_API_SETTINGS.frequency_penalty,
    messages: [
      { role: 'system', content: result.systemPrompt },
      { role: 'user',   content: result.userMessage  },
    ],
  })

  const storyText = completion.choices[0]?.message?.content
  if (!storyText) {
    console.error('No story returned from Azure OpenAI.')
    process.exit(1)
  }

  // Title extraction (mirrors production route)
  const lines     = storyText.split('\n').filter((l) => l.trim().length > 0)
  const firstLine = lines[0]?.replace(/^#+\s*/, '').replace(/^\*+|\*+$/g, '').trim()
  const hasTitle  = firstLine && firstLine.length < 80
  const title     = hasTitle ? firstLine : `${childName}'s ${result.world.name} Story`
  const storyBody = hasTitle ? lines.slice(1).join('\n\n').trim() : storyText.trim()

  const usage = completion.usage

  // ── RAW OUTPUT ──────────────────────────────────────────────────────────────
  console.log(`TITLE: ${title}`)
  console.log('─'.repeat(60))
  console.log('RAW STORY:')
  console.log('─'.repeat(60))
  console.log(storyBody)
  console.log('─'.repeat(60))
  console.log(`Tokens — prompt: ${usage?.prompt_tokens}, completion: ${usage?.completion_tokens}`)
  console.log(`Words  — ~${storyBody.split(/\s+/).length}`)

  // ── SANITIZED OUTPUT ────────────────────────────────────────────────────────
  const rawTagStats = analyzeTagDensity(storyBody)
  const { text: sanitized, stripped, warnings } = prepareTextForFishAudio(storyBody)
  const sanitizedTagStats = analyzeTagDensity(sanitized)

  console.log('\n' + '─'.repeat(60))
  console.log('SANITIZED STORY (Fish Audio ready):')
  console.log('─'.repeat(60))
  console.log(sanitized)
  console.log('─'.repeat(60))

  console.log(`Tags (raw)       : ${rawTagStats.count} tags, ${rawTagStats.density.toFixed(1)} per 100 words`)
  console.log(`Tags (sanitized) : ${sanitizedTagStats.count} tags, ${sanitizedTagStats.density.toFixed(1)} per 100 words`)

  if (stripped.length > 0) {
    console.log(`\nStripped tags (${stripped.length}): ${[...new Set(stripped)].join(', ')}`)
  }
  if (warnings.length > 0) {
    console.log('\nWarnings:')
    warnings.forEach((w) => console.log(`  ⚠ ${w}`))
  }
  if (stripped.length === 0 && warnings.length === 0) {
    console.log('\nAll tags passed sanitization.')
  }
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
