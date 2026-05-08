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
 */
const APPROVED_TAGS = new Set([
  'pause', 'short pause', 'slow',
  'soft', 'soft voice', 'low voice', 'whisper',
  'exhale',
  'gentle', 'emphasis',  // 'tender' removed
])

/**
 * Common LLM hallucinations mapped to their canonical Storybell equivalents.
 * Anything mapped to null is silently stripped (banned content).
 */
const TAG_ALIASES = {
  // Pacing variants
  'slowly': 'slow',
  'long pause': 'pause',
  'pausing': 'pause',
  'beat': 'pause',
  
  // Voice quality variants
  'softly': 'soft',
  'quietly': 'soft voice',
  'quiet': 'soft voice',
  'hushed': 'soft voice',
  'whispered': 'whisper',
  'whispering': 'whisper',
  'whisper softly': 'whisper',
  'low': 'low voice',
  'deep voice': 'low voice',
  
  // Emotion variants
  'gently': 'gentle',
  'tender': 'gentle',       // newly mapped
  'tenderly': 'gentle',
  'warm': 'gentle',
  'warmly': 'gentle',
  'calm': 'gentle',
  'calmly': 'gentle',
  'peaceful': 'gentle',
  'peacefully': 'gentle',
  'kindly': 'gentle',
  
  // Breath variants
  'sigh': 'exhale',
  'sighs': 'exhale',
  'sighing': 'exhale',
  'breath': 'exhale',
  'breathe': 'exhale',
  'breathe out': 'exhale',
  
  // Banned (silently stripped — bedtime-inappropriate)
  'excited': null,
  'laughing': null,
  'laugh': null,
  'shouting': null,
  'shout': null,
  'loud': null,
  'angry': null,
  'surprised': null,
  'screaming': null,
  'shocked': null,
  'panting': null,
  'crying': null,
  'sad': null,
  'moaning': null,
  'dramatic': null,
  'intense': null,
  'urgent': null,
  'fearful': null,
  'scared': null,
}

/**
 * Sanitizes Fish Audio emotion tags in story text.
 * 
 * - Approved tags pass through unchanged.
 * - Aliased tags are normalized to their canonical form.
 * - Unknown tags are stripped (with a warning logged for review).
 * - Banned tags are silently removed.
 * - Compound tags (e.g., "low voice, slow") are split, validated, and rejoined.
 * 
 * @param {string} text - Story text with [tags] embedded by the LLM
 * @returns {{ sanitized: string, stripped: string[], warnings: string[] }}
 */
function sanitizeFishAudioTags(text) {
  const stripped = []
  const warnings = []
  
  const sanitized = text.replace(/\[([^\]]+)\]/g, (match, rawContent) => {
    const tagContent = rawContent.trim().toLowerCase()
    
    // Handle compound tags like "low voice, slow"
    const parts = tagContent.split(',').map(p => p.trim()).filter(Boolean)
    const normalized = []
    
    for (const part of parts) {
      if (APPROVED_TAGS.has(part)) {
        normalized.push(part)
      } else if (part in TAG_ALIASES) {
        const aliased = TAG_ALIASES[part]
        if (aliased) {
          normalized.push(aliased)
        } else {
          stripped.push(part)
        }
      } else {
        // Unknown — strip and warn for review
        stripped.push(part)
        warnings.push(`Unknown tag stripped: [${part}]`)
      }
    }
    
    if (normalized.length === 0) return ''
    return `[${normalized.join(', ')}]`
  })
  
  // Tidy up double spaces / orphaned blank lines from removals
  const tidied = sanitized
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  
  return { sanitized: tidied, stripped, warnings }
}

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
