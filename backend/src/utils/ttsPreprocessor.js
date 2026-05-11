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
// MAIN EXPORTS
// ─────────────────────────────────────────────

/**
 * Full pre-processing pipeline for ElevenLabs (SSML).
 * Pass story body (title already stripped) and vibeId.
 * The returned string is ready to send to ElevenLabs with enable_ssml_parsing: true.
 *
 * @param {string} text   — story body, title already stripped
 * @param {string} vibeId — one of: cozy | brave | kind | wonder | friends | inspired
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

/**
 * Full pre-processing pipeline for Fish Audio (emotion tags).
 * Tags are embedded by the LLM at generation time — this function sanitizes
 * and normalizes them, strips markdown, and cleans up punctuation.
 *
 * @param {string} text — story body, title already stripped, tags already embedded
 * @returns {{ text: string, stripped: string[], warnings: string[] }}
 */
function prepareTextForFishAudio(text) {
  let t = text.trim()

  t = normalizeEmDashes(t)
  t = normalizeEllipses(t)
  t = stripMarkdown(t)

  const { sanitized, stripped, warnings } = sanitizeFishAudioTags(t)

  return { text: sanitized.trim(), stripped, warnings }
}

// ─────────────────────────────────────────────
// FISH AUDIO TAG SANITIZER
// ─────────────────────────────────────────────

/**
 * The single source of truth for tags Storybell allows in TTS output.
 * Anything not in this set (or mappable via TAG_ALIASES) gets stripped.
 *
 * Aligned with Fish Audio S2's published 33-tag library where possible.
 * Tags marked "free-form" are not on Fish's curated list but are training-
 * frequent natural language and reliably interpreted by S2.
 */
const APPROVED_TAGS = new Set([
  // Structural (curated)
  'pause', 'short pause',

  // Voice register (curated: low voice, whisper, exhale; free-form: soft voice)
  'soft voice', 'low voice', 'whisper', 'exhale',

  // Pacing (free-form, reliable)
  'slow',

  // Texture & warmth (curated: low volume; free-form: gentle)
  'gentle', 'low volume',

  // Lift (curated)
  'emphasis',
])

/**
 * Common LLM hallucinations mapped to their canonical Storybell equivalents.
 * Anything mapped to null is silently stripped (banned content).
 *
 * Routing principle:
 *   - "soft / softly / quiet / quietly / hushed" → low volume (volume control)
 *   - "calm / peaceful / warm / tender / kind" → gentle (warmth control)
 *   - "low / deep" → low voice (register control)
 *   - "sigh / breath" → exhale (breath control)
 */
const TAG_ALIASES = {
  // Pacing variants
  'slowly': 'slow',
  'long pause': 'pause',
  'pausing': 'pause',
  'beat': 'short pause',

  // Volume variants → low volume
  'soft': 'low volume',
  'softly': 'low volume',
  'quiet': 'low volume',
  'quietly': 'low volume',
  'hushed': 'low volume',
  'low volume voice': 'low volume',

  // Whisper variants
  'whispered': 'whisper',
  'whispering': 'whisper',
  'whisper softly': 'whisper',

  // Register variants → low voice
  'low': 'low voice',
  'deep voice': 'low voice',
  'deeper voice': 'low voice',

  // Soft voice variants
  'gentle voice': 'soft voice',
  'soft tone': 'soft voice',

  // Warmth variants → gentle
  'gently': 'gentle',
  'tender': 'gentle',
  'tenderly': 'gentle',
  'warm': 'gentle',
  'warmly': 'gentle',
  'calm': 'gentle',
  'calmly': 'gentle',
  'peaceful': 'gentle',
  'peacefully': 'gentle',
  'kindly': 'gentle',

  // Emphasis variants
  'emphasized': 'emphasis',
  'emphasised': 'emphasis',
  'stress': 'emphasis',

  // Breath variants → exhale
  'sigh': 'exhale',
  'sighs': 'exhale',
  'sighing': 'exhale',
  'breath': 'exhale',
  'breathe': 'exhale',
  'breathe out': 'exhale',
  'breathes out': 'exhale',

  // Banned — real S2 tags that would activate and break atmosphere
  'excited': null,
  'laughing': null,
  'shouting': null,
  'loud': null,
  'angry': null,
  'surprised': null,
  'screaming': null,
  'shocked': null,
  'panting': null,
  'sad': null,
  'moaning': null,
  'chuckling': null,
  'singing': null,
  'volume up': null,

  // Banned — common LLM hallucinations that would be unsafe to pass through
  'laugh': null,
  'shout': null,
  'crying': null,
  'cry': null,
  'sobbing': null,
  'fearful': null,
  'scared': null,
  'dramatic': null,
  'intense': null,
  'urgent': null,
}

/**
 * Pairs of tags that overlap semantically. When both appear in the same
 * compound bracket, the second is dropped (the first wins).
 *
 * This prevents the "two warmth instructions fighting each other" failure
 * mode that the prompt warns against — e.g. the LLM writing
 * [low voice, low volume] which gives the model two competing volume signals.
 */
const OVERLAP_GROUPS = [
  new Set(['low volume', 'soft voice', 'low voice', 'whisper']), // volume/register
  new Set(['gentle', 'soft voice']),                              // warmth/softness
]

function findOverlap(existing, candidate) {
  for (const group of OVERLAP_GROUPS) {
    if (group.has(candidate) && existing.some(t => group.has(t) && t !== candidate)) {
      return true
    }
  }
  return false
}

/**
 * Sanitizes Fish Audio emotion tags in story text.
 *
 * - Approved tags pass through unchanged.
 * - Aliased tags are normalized to their canonical form.
 * - Unknown tags are stripped (with a warning logged for review).
 * - Banned tags are silently removed.
 * - Compound tags (e.g., "low voice, slow") are split, validated, deduped,
 *   and checked for semantic overlap before being rejoined.
 *
 * @param {string} text - Story text with [tags] embedded by the LLM
 * @returns {{ sanitized: string, stripped: string[], warnings: string[] }}
 */
function sanitizeFishAudioTags(text) {
  const stripped = []
  const warnings = []

  let sanitized = text.replace(/\[([^\]]+)\]/g, (_match, rawContent) => {
    const tagContent = rawContent.trim().toLowerCase()

    // Compound tags like "low voice, slow"
    const parts = tagContent.split(',').map(p => p.trim()).filter(Boolean)
    const normalized = []

    for (const part of parts) {
      let resolved = null

      if (APPROVED_TAGS.has(part)) {
        resolved = part
      } else if (part in TAG_ALIASES) {
        const aliased = TAG_ALIASES[part]
        if (aliased) {
          resolved = aliased
        } else {
          // Banned — silently strip
          stripped.push(part)
          continue
        }
      } else {
        // Unknown — strip and warn for review
        stripped.push(part)
        warnings.push(`Unknown tag stripped: [${part}]`)
        continue
      }

      // Skip exact duplicates within the same bracket
      if (normalized.includes(resolved)) {
        warnings.push(`Duplicate tag in compound dropped: [${resolved}]`)
        continue
      }

      // Skip semantically overlapping tags (volume vs register, etc.)
      if (findOverlap(normalized, resolved)) {
        warnings.push(`Overlapping tag dropped from compound: [${resolved}]`)
        continue
      }

      normalized.push(resolved)
    }

    if (normalized.length === 0) return ''

    // Cap at 2 tags per bracket per the prompt's combine rule
    if (normalized.length > 2) {
      warnings.push(`Compound tag truncated to 2: had ${normalized.length}`)
      normalized.length = 2
    }

    return `[${normalized.join(', ')}]`
  })

  // Tidy up artifacts from removals:
  //   - blank-line-only-bracket-removed cases
  //   - double spaces
  //   - excess blank lines
  sanitized = sanitized
    .replace(/^[ \t]*\n/gm, m => m) // preserve intentional blank lines
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')      // trailing whitespace before newline
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { sanitized, stripped, warnings }
}

module.exports = { sanitizeFishAudioTags, APPROVED_TAGS, TAG_ALIASES }
/**
 * Tag density check — sanity check the LLM didn't go overboard.
 * Returns { count, density } where density is tags per 100 words.
 */
function analyzeTagDensity(text) {
  const tagMatches = text.match(/\[[^\]]+\]/g) || []
  const wordCount = text.replace(/\[[^\]]+\]/g, '').trim().split(/\s+/).length
  return {
    count: tagMatches.length,
    density: (tagMatches.length / wordCount) * 100,
  }
}

/**
 * Strips all Fish Audio emotion tags for display in the reading view.
 * @param {string} text — tagged story text
 * @returns {string}    — clean text safe to render
 */
function stripTagsForDisplay(text) {
  return text.replace(/\[[^\]]+\]/g, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

module.exports = {
  prepareTextForTTS,
  prepareTextForFishAudio,
  sanitizeFishAudioTags,
  analyzeTagDensity,
  stripTagsForDisplay,
  VIBE_BREAK_MS,
  _transforms: {
    normalizeEmDashes,
    normalizeEllipses,
    stripMarkdown,
    applyPronunciationDictionary,
    addSleepEndingBreaks,
    injectParagraphBreaks,
    sanitizeFishAudioTags,
    analyzeTagDensity,
  },
}
