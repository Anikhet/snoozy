'use strict'

/**
 * TTS Pre-processor — transforms story text into voice-ready text for ElevenLabs.
 *
 * Pipeline (order matters):
 *   1. Normalize em-dashes / en-dashes  → pause-friendly comma
 *   2. Normalize ellipses               → Unicode … token
 *   3. Strip markdown bold/italic       → bare text
 *   4. Apply pronunciation dictionary   → <phoneme> SSML tags
 *   5. Sleep-ending breaks              → sentence-level SSML breaks in last paragraph
 *   6. Paragraph breaks                 → vibe-timed SSML breaks between sections
 *
 * Note: title stripping is handled upstream (story generation route) before
 * storyText reaches this function.
 *
 * Requires enable_ssml_parsing: true in the ElevenLabs API request.
 */

// ─────────────────────────────────────────────
// VIBE-AWARE PARAGRAPH BREAK TIMINGS
// ─────────────────────────────────────────────

const VIBE_BREAK_MS = {
  cozy:    900,
  brave:   600,
  kind:    700,
  wonder:  700,
  friends: 700,
  inspired: 700,
}
const DEFAULT_BREAK_MS = 700

// ─────────────────────────────────────────────
// PRONUNCIATION DICTIONARY
// Covers commonly mispronounced South Asian names.
// Format: [displayName, IPA transcription]
// Add entries as new names surface in user testing.
// ─────────────────────────────────────────────

const PRONUNCIATION_DICTIONARY = [
  ['Aarav',   'ɑːrəv'],
  ['Ananya',  'əˈnʌnjə'],
  ['Priya',   'ˈpriːjə'],
  ['Arjun',   'ˈɑːrdʒʌn'],
  ['Diya',    'ˈdiːjə'],
  ['Vihaan',  'vɪˈhɑːn'],
  ['Ishaan',  'ɪˈʃɑːn'],
  ['Aanya',   'ˈɑːnjə'],
  ['Kavya',   'ˈkʌvjə'],
  ['Rohan',   'ˈroʊhən'],
  ['Saanvi',  'ˈsɑːnvi'],
  ['Riya',    'ˈriːjə'],
  ['Advait',  'ˈʌdvʌɪt'],
  ['Aditya',  'əˈdɪtjə'],
  ['Kiara',   'kiˈɑːrə'],
  ['Zara',    'ˈzɑːrə'],
  ['Siya',    'ˈsiːjə'],
  ['Reyansh', 'reɪˈjɑːnʃ'],
  ['Aarohi',  'ɑːˈroʊhi'],
  ['Vivaan',  'vɪˈvɑːn'],
]

// ─────────────────────────────────────────────
// TRANSFORMS
// ─────────────────────────────────────────────

function normalizeEmDashes(text) {
  return text.replace(/[—–]/g, ', ')
}

function normalizeEllipses(text) {
  return text.replace(/\.{3,}/g, '…').replace(/… +/g, '… ')
}

function stripMarkdown(text) {
  // Strip bold (**word**) and italic (*word*) — keep the inner text
  return text.replace(/\*\*?(.+?)\*\*?/gs, '$1')
}

function applyPronunciationDictionary(text) {
  for (const [name, ipa] of PRONUNCIATION_DICTIONARY) {
    // Negative lookbehind for > prevents re-wrapping names already inside a phoneme tag
    const re = new RegExp(`(?<!>)\\b${name}\\b`, 'g')
    text = text.replace(re, `<phoneme alphabet="ipa" ph="${ipa}">${name}</phoneme>`)
  }
  return text
}

/**
 * Adds sentence-level SSML breaks inside the last paragraph (the sleep ending).
 * Inserts 1200ms between sentences and a 1500ms trailing break after the final one.
 * Must run BEFORE injectParagraphBreaks so double-newline boundaries are still intact.
 */
function addSleepEndingBreaks(text) {
  const paragraphs = text.split('\n\n')
  if (paragraphs.length < 2) return text

  const last = paragraphs[paragraphs.length - 1].trim()

  // Match sentences ending in . ! ? with optional closing quote
  const sentences = last.match(/[^.!?]+[.!?]+['"']?/g)
  if (!sentences || sentences.length < 2) return text

  const processedLast =
    sentences.map((s) => s.trim()).join('\n<break time="1200ms"/>\n') +
    '\n<break time="1500ms"/>'

  return [...paragraphs.slice(0, -1), processedLast].join('\n\n')
}

/**
 * Replaces double-newline paragraph breaks with vibe-timed SSML break tags.
 * Must run AFTER addSleepEndingBreaks — the sleep ending uses single newlines
 * for its sentence-level breaks, so they won't be touched here.
 */
function injectParagraphBreaks(text, vibeId) {
  const ms = VIBE_BREAK_MS[vibeId] ?? DEFAULT_BREAK_MS
  return text.replace(/\n\n/g, `\n<break time="${ms}ms"/>\n`)
}

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

/**
 * Full pre-processing pipeline. Pass story body (title already stripped) and vibeId.
 * The returned string is ready to send to ElevenLabs with enable_ssml_parsing: true.
 *
 * @param {string} text   — story body, title already stripped
 * @param {string} vibeId — one of: cozy | brave | kind | wonder | friends
 * @returns {string}      — TTS-ready text with SSML annotations
 */
function prepareTextForTTS(text, vibeId) {
  let t = text.trim()

  t = normalizeEmDashes(t)
  t = normalizeEllipses(t)
  t = stripMarkdown(t)
  t = applyPronunciationDictionary(t)
  t = addSleepEndingBreaks(t)     // must come before injectParagraphBreaks
  t = injectParagraphBreaks(t, vibeId)

  return t.trim()
}

module.exports = {
  prepareTextForTTS,
  VIBE_BREAK_MS,
  // Exported for testing individual transforms
  _transforms: {
    normalizeEmDashes,
    normalizeEllipses,
    stripMarkdown,
    applyPronunciationDictionary,
    addSleepEndingBreaks,
    injectParagraphBreaks,
  },
}
