#!/usr/bin/env node
/**
 * Pronoun integration test.
 *
 * Tests the full chain:
 *   Zod schema validation → buildPrompt injection → prompt string content
 *
 * No API calls. No server needed.
 * Run: node tests/test-pronouns.js
 */

const { z } = require('zod')
const { buildPrompt, WORLDS, VIBES } = require('../src/prompts/templates')

// ─── Reproduce the route schema ────────────────────────────────────────────
const validWorldIds = WORLDS.map((w) => w.id)
const validVibeIds  = VIBES.map((v) => v.id)

const generateStorySchema = z.object({
  worldId: z.enum(validWorldIds).optional().default('forest'),
  vibeId:  z.enum(validVibeIds).optional().default('cozy'),
  childDetails: z.object({
    name:     z.string().min(1).max(50),
    age:      z.number().int().min(1).max(10),
    pronouns: z.enum(['he/him', 'she/her', 'they/them']).optional().default('they/them'),
  }),
})

// ─── Helpers ───────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}`)
    failed++
  }
}

function assertContains(str, substring, label) {
  assert(str.includes(substring), `${label} — contains "${substring}"`)
}

function assertNotContains(str, substring, label) {
  assert(!str.includes(substring), `${label} — does not contain "${substring}"`)
}

// ─── TEST 1: Schema validates and defaults pronouns ────────────────────────

console.log('\n[1] Zod schema — pronoun field validation')

const withHeHim = generateStorySchema.parse({
  childDetails: { name: 'Oliver', age: 6, pronouns: 'he/him' },
})
assert(withHeHim.childDetails.pronouns === 'he/him', 'he/him passes through')

const withSheHer = generateStorySchema.parse({
  childDetails: { name: 'Mia', age: 4, pronouns: 'she/her' },
})
assert(withSheHer.childDetails.pronouns === 'she/her', 'she/her passes through')

const withTheyThem = generateStorySchema.parse({
  childDetails: { name: 'Alex', age: 7, pronouns: 'they/them' },
})
assert(withTheyThem.childDetails.pronouns === 'they/them', 'they/them passes through')

const withOmitted = generateStorySchema.parse({
  childDetails: { name: 'River', age: 5 },
})
assert(withOmitted.childDetails.pronouns === 'they/them', 'omitted pronouns default to they/them')

let schemaRejected = false
try {
  generateStorySchema.parse({ childDetails: { name: 'X', age: 5, pronouns: 'xe/xem' } })
} catch (_) {
  schemaRejected = true
}
assert(schemaRejected, 'invalid pronoun value is rejected')

// ─── TEST 2: buildPrompt injects he/him ────────────────────────────────────

console.log('\n[2] buildPrompt — he/him injection')

const heResult = buildPrompt('forest', 'cozy', { name: 'Oliver', age: 6, pronouns: 'he/him' })
assert(heResult !== null, 'returns a result')
assertContains(heResult.systemPrompt, 'he/him/his', 'CHILD PROFILE block shows he/him/his')
assertContains(heResult.systemPrompt, 'he/him/his pronouns', 'CRAFT RULE references he/him/his pronouns')
assertNotContains(heResult.systemPrompt, '{subject}', 'no unreplaced {subject} placeholder')
assertNotContains(heResult.systemPrompt, '{object}',  'no unreplaced {object} placeholder')
assertNotContains(heResult.systemPrompt, '{possessive}', 'no unreplaced {possessive} placeholder')

// ─── TEST 3: buildPrompt injects she/her ───────────────────────────────────

console.log('\n[3] buildPrompt — she/her injection')

const sheResult = buildPrompt('kingdom', 'brave', { name: 'Mia', age: 4, pronouns: 'she/her' })
assert(sheResult !== null, 'returns a result')
assertContains(sheResult.systemPrompt, 'she/her/her', 'CHILD PROFILE block shows she/her/her')
assertContains(sheResult.systemPrompt, 'she/her/her pronouns', 'CRAFT RULE references she/her/her pronouns')
assertNotContains(sheResult.systemPrompt, '{subject}', 'no unreplaced {subject} placeholder')

// ─── TEST 4: buildPrompt injects they/them ─────────────────────────────────

console.log('\n[4] buildPrompt — they/them injection')

const theyResult = buildPrompt('space', 'wonder', { name: 'Alex', age: 7, pronouns: 'they/them' })
assert(theyResult !== null, 'returns a result')
assertContains(theyResult.systemPrompt, 'they/them/their', 'CHILD PROFILE block shows they/them/their')
assertContains(theyResult.systemPrompt, 'they/them/their pronouns', 'CRAFT RULE references they/them/their pronouns')
assertNotContains(theyResult.systemPrompt, '{subject}', 'no unreplaced {subject} placeholder')

// ─── TEST 5: buildPrompt defaults to they/them when omitted ────────────────

console.log('\n[5] buildPrompt — defaults to they/them when pronouns omitted')

const defaultResult = buildPrompt('ocean', 'kind', { name: 'River', age: 5 })
assert(defaultResult !== null, 'returns a result')
assertContains(defaultResult.systemPrompt, 'they/them/their', 'defaults to they/them/their when omitted')

// ─── TEST 6: Child name is still injected alongside pronouns ───────────────

console.log('\n[6] buildPrompt — name + pronouns coexist correctly')

const combined = buildPrompt('clouds', 'friends', { name: 'Zara', age: 8, pronouns: 'she/her' })
assertContains(combined.systemPrompt, 'Name: Zara', 'name is present')
assertContains(combined.systemPrompt, 'she/her/her', 'pronouns are present')
assertContains(combined.userMessage, 'Zara', 'name appears in user message')

// ─── TEST 7: Verify actual prompt structure snapshot ──────────────────────

console.log('\n[7] Prompt structure — CHILD PROFILE section snapshot')

const snap = buildPrompt('forest', 'cozy', { name: 'Leo', age: 6, pronouns: 'he/him' })
const profileIdx = snap.systemPrompt.indexOf('CHILD PROFILE')
const profileSlice = snap.systemPrompt.slice(profileIdx, profileIdx + 300)
assert(profileIdx !== -1, 'CHILD PROFILE section exists')
assertContains(profileSlice, 'Name: Leo', 'Name line present in CHILD PROFILE')
assertContains(profileSlice, 'Pronouns: he/him/his', 'Pronouns line present in CHILD PROFILE')
assertContains(profileSlice, 'Age: 6', 'Age line present in CHILD PROFILE')

// ─── Summary ───────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error('SOME TESTS FAILED')
  process.exit(1)
} else {
  console.log('All tests passed ✓')
}
