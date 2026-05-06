#!/usr/bin/env node
/**
 * Unit tests for the TTS pre-processor pipeline.
 * No API calls. No server needed.
 * Run: node tests/test-tts-preprocessor.js
 */

const {
  prepareTextForTTS,
  VIBE_BREAK_MS,
  _transforms: {
    normalizeEmDashes,
    normalizeEllipses,
    stripMarkdown,
    applyPronunciationDictionary,
    addSleepEndingBreaks,
    injectParagraphBreaks,
  },
} = require('../src/utils/ttsPreprocessor')

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

function assertContains(str, sub, label) {
  assert(str.includes(sub), `${label}  →  contains "${sub}"`)
}

function assertNotContains(str, sub, label) {
  assert(!str.includes(sub), `${label}  →  does not contain "${sub}"`)
}

// ─── 1. normalizeEmDashes ─────────────────────────────────────────────────

console.log('\n[1] normalizeEmDashes')

assertContains(normalizeEmDashes('She looked up—then smiled.'), ', ', 'em-dash → comma')
assertContains(normalizeEmDashes('Soft–quiet–still.'), ', ', 'en-dash → comma')
assertNotContains(normalizeEmDashes('She looked up—then smiled.'), '—', 'no em-dash remains')
assert(
  normalizeEmDashes('One—two—three') === 'One, two, three',
  'multiple em-dashes replaced'
)

// ─── 2. normalizeEllipses ─────────────────────────────────────────────────

console.log('\n[2] normalizeEllipses')

assert(normalizeEllipses('Wait...') === 'Wait…', '3-dot → Unicode ellipsis')
assert(normalizeEllipses('Wait....') === 'Wait…', '4-dot → Unicode ellipsis')
assert(normalizeEllipses('Wait…  the end') === 'Wait… the end', 'extra spaces collapsed to one after ellipsis')
assertNotContains(normalizeEllipses('Soft... quiet...'), '...', 'no remaining 3-dot ellipsis')

// ─── 3. stripMarkdown ────────────────────────────────────────────────────

console.log('\n[3] stripMarkdown')

assert(stripMarkdown('*hummm*') === 'hummm', 'italic stripped')
assert(stripMarkdown('**whisper**') === 'whisper', 'bold stripped')
assert(stripMarkdown('She *whispered* softly.') === 'She whispered softly.', 'inline italic stripped')
assert(stripMarkdown('*thump* *plink* *hush*') === 'thump plink hush', 'multiple italics stripped')
assertNotContains(stripMarkdown('*word*'), '*', 'no asterisks remain')

// ─── 4. applyPronunciationDictionary ─────────────────────────────────────

console.log('\n[4] applyPronunciationDictionary')

const priyaOut = applyPronunciationDictionary('Priya walked through the forest.')
assertContains(priyaOut, '<phoneme', 'phoneme tag injected for Priya')
assertContains(priyaOut, 'ˈpriːjə', 'correct IPA for Priya')
assertContains(priyaOut, '>Priya<', 'display name preserved inside phoneme tag')

const aaravOut = applyPronunciationDictionary('Aarav and Priya met.')
assertContains(aaravOut, 'ɑːrəv', 'Aarav IPA injected')
assertContains(aaravOut, 'ˈpriːjə', 'Priya IPA injected in same string')

// Unknown names untouched
const unknown = applyPronunciationDictionary('Oliver walked slowly.')
assertNotContains(unknown, '<phoneme', 'unknown name not wrapped in phoneme tag')

// No double-wrapping on re-run
const once = applyPronunciationDictionary('Priya slept.')
const twice = applyPronunciationDictionary(once)
assert(
  (twice.match(/<phoneme/g) || []).length === (once.match(/<phoneme/g) || []).length,
  'running dictionary twice does not double-wrap'
)

// ─── 5. addSleepEndingBreaks ─────────────────────────────────────────────

console.log('\n[5] addSleepEndingBreaks')

const multiPara = [
  'The forest was warm and full of light.',
  '',
  'A little fox trotted down the path.',
  '',
  'She closed her eyes. The stars blinked softly. And sleep came, warm and quiet.',
].join('\n')

const withBreaks = addSleepEndingBreaks(multiPara)
assertContains(withBreaks, '<break time="1200ms"/>', '1200ms breaks between sleep-ending sentences')
assertContains(withBreaks, '<break time="1500ms"/>', '1500ms trailing break after final sentence')

// Check that earlier paragraphs are untouched
const lines = withBreaks.split('\n')
const firstLine = lines[0]
assertNotContains(firstLine, '<break', 'first paragraph has no injected breaks')

// Single paragraph: no breaks added (not enough structure)
const singlePara = 'She slept and dreamed of stars.'
assert(addSleepEndingBreaks(singlePara) === singlePara, 'single paragraph returned unchanged')

// ─── 6. injectParagraphBreaks ────────────────────────────────────────────

console.log('\n[6] injectParagraphBreaks')

const twoParas = 'First paragraph.\n\nSecond paragraph.'

assert(
  injectParagraphBreaks(twoParas, 'cozy').includes('<break time="900ms"/>'),
  'cozy gets 900ms paragraph break'
)
assert(
  injectParagraphBreaks(twoParas, 'brave').includes('<break time="600ms"/>'),
  'brave gets 600ms paragraph break'
)
assert(
  injectParagraphBreaks(twoParas, 'unknown_vibe').includes('<break time="700ms"/>'),
  'unknown vibe falls back to 700ms'
)
assertNotContains(
  injectParagraphBreaks(twoParas, 'cozy'),
  '\n\n',
  'no bare double-newlines remain after injection'
)

// ─── 7. VIBE_BREAK_MS covers all known vibes ─────────────────────────────

console.log('\n[7] VIBE_BREAK_MS completeness')

const knownVibes = ['cozy', 'brave', 'kind', 'wonder', 'friends']
for (const vibe of knownVibes) {
  assert(typeof VIBE_BREAK_MS[vibe] === 'number', `${vibe} has a numeric break time`)
  assert(VIBE_BREAK_MS[vibe] >= 500 && VIBE_BREAK_MS[vibe] <= 1200, `${vibe} break time is in sane range`)
}

// ─── 8. prepareTextForTTS — full pipeline ────────────────────────────────

console.log('\n[8] prepareTextForTTS — full pipeline integration')

const sampleStory = [
  'The moon hung low over the Enchanted Forest — silver and still.',
  '',
  'Priya followed a trail of fireflies deeper into the trees.',
  'Each one *hummed* softly... as if singing just for her.',
  '',
  'She found a mossy ledge and sat down. The forest exhaled around her. And slowly, gently, she drifted to sleep.',
].join('\n')

const result = prepareTextForTTS(sampleStory, 'cozy')

assertNotContains(result, '—', 'em-dash removed')
assertNotContains(result, '...', '3-dot ellipsis removed')
assertNotContains(result, '*', 'markdown asterisks removed')
assertContains(result, '<phoneme', 'Priya has phoneme tag')
assertContains(result, '<break time="1200ms"/>', 'sleep-ending sentence breaks present')
assertContains(result, '<break time="1500ms"/>', 'trailing sleep break present')
assertContains(result, '<break time="900ms"/>', 'cozy paragraph breaks present')
assertNotContains(result, '\n\n', 'no bare double-newlines remain')
assert(result.trim().length > 0, 'output is non-empty')

// ─── 9. Pipeline ordering — sleep breaks survive paragraph injection ──────

console.log('\n[9] Pipeline ordering — sleep breaks not clobbered by paragraph injection')

const ordered = prepareTextForTTS(sampleStory, 'brave')
// Sleep ending has 1200ms breaks — paragraph breaks are 600ms for brave
// Both should co-exist
assertContains(ordered, '<break time="1200ms"/>', '1200ms sleep breaks present')
assertContains(ordered, '<break time="600ms"/>',  '600ms paragraph breaks present')

// ─── 10. enable_ssml_parsing safety — no literal tag text leaked ─────────

console.log('\n[10] SSML tag integrity — no unmatched or malformed tags')

const tagsInResult = result.match(/<break[^>]+\/>/g) || []
assert(tagsInResult.length > 0, 'at least one break tag present')
for (const tag of tagsInResult) {
  assert(/^<break time="\d+ms"\/>$/.test(tag), `tag is well-formed: ${tag}`)
}

// ─── Summary ─────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error('SOME TESTS FAILED')
  process.exit(1)
} else {
  console.log('All tests passed ✓')
}
