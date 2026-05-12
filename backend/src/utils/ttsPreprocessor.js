'use strict'

// ─────────────────────────────────────────────
// SHARED BASE TRANSFORMS
// Applied identically across all TTS providers.
// ─────────────────────────────────────────────

function normalizeEmDashes(text) {
  return text.replace(/[—–]/g, ', ')
}

function normalizeEllipses(text) {
  return text.replace(/\.{3,}/g, '…').replace(/… +/g, '… ')
}

function stripMarkdown(text) {
  return text.replace(/\*\*?(.+?)\*\*?/gs, '$1')
}

function applyBaseTransforms(text) {
  return stripMarkdown(normalizeEllipses(normalizeEmDashes(text)))
}

// ─────────────────────────────────────────────
// SSML PIPELINE (ElevenLabs V2 / Azure TTS-HD)
// ─────────────────────────────────────────────

/**
 * Vibe-aware paragraph break timings for SSML providers.
 * Used by ElevenLabs V2 and Azure TTS-HD.
 */
const VIBE_BREAK_MS = {
  cozy:     900,
  brave:    600,
  kind:     700,
  wonder:   700,
  friends:  700,
  inspired: 700,
}
const DEFAULT_BREAK_MS = 700

/**
 * Pronunciation dictionary for South Asian names commonly mispronounced by TTS.
 * Format: [displayName, IPA transcription].
 * SSML-only — not applicable to V3 or Fish Audio.
 */
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

function applyPronunciationDictionary(text) {
  for (const [name, ipa] of PRONUNCIATION_DICTIONARY) {
    const re = new RegExp(`(?<!>)\\b${name}\\b`, 'g')
    text = text.replace(re, `<phoneme alphabet="ipa" ph="${ipa}">${name}</phoneme>`)
  }
  return text
}

/**
 * Adds sentence-level SSML breaks inside the last paragraph (the sleep ending).
 * Must run BEFORE injectParagraphBreaks so double-newline boundaries are still intact.
 */
function addSleepEndingBreaks(text) {
  const paragraphs = text.split('\n\n')
  if (paragraphs.length < 2) return text

  const last = paragraphs[paragraphs.length - 1].trim()
  const sentences = last.match(/[^.!?]+[.!?]+['"']?/g)
  if (!sentences || sentences.length < 2) return text

  const processedLast =
    sentences.map((s) => s.trim()).join('\n<break time="1200ms"/>\n') +
    '\n<break time="1500ms"/>'

  return [...paragraphs.slice(0, -1), processedLast].join('\n\n')
}

/**
 * Replaces double-newline paragraph breaks with vibe-timed SSML break tags.
 * Must run AFTER addSleepEndingBreaks.
 */
function injectParagraphBreaks(text, vibeId) {
  const ms = VIBE_BREAK_MS[vibeId] ?? DEFAULT_BREAK_MS
  return text.replace(/\n\n/g, `\n<break time="${ms}ms"/>\n`)
}

/**
 * Full pre-processing pipeline for ElevenLabs V2 / Azure TTS-HD (SSML).
 * Returns TTS-ready text with SSML annotations.
 *
 * @param {string} text   — story body, title already stripped
 * @param {string} vibeId — cozy | brave | kind | wonder | friends | inspired
 * @returns {string}
 */
function prepareTextForTTS(text, vibeId) {
  let t = text.trim()
  t = normalizeEmDashes(t)
  t = normalizeEllipses(t)
  t = stripMarkdown(t)
  t = applyPronunciationDictionary(t)
  t = addSleepEndingBreaks(t)
  t = injectParagraphBreaks(t, vibeId)
  return t.trim()
}

// ─────────────────────────────────────────────
// SHARED TAG SANITIZER
// Drives both the Fish Audio and ElevenLabs V3 pipelines.
// Each provider passes its own approved set, alias map, and overlap groups.
// ─────────────────────────────────────────────

/**
 * @param {string}  text
 * @param {Set}     approvedTags
 * @param {object}  tagAliases   — { variant: canonical } or { variant: null } for banned
 * @param {Set[]}   overlapGroups
 * @returns {{ sanitized: string, stripped: string[], warnings: string[] }}
 */
function _sanitizeTags(text, approvedTags, tagAliases, overlapGroups) {
  const stripped = []
  const warnings = []

  function hasOverlap(existing, candidate) {
    for (const group of overlapGroups) {
      if (group.has(candidate) && existing.some(t => group.has(t) && t !== candidate)) {
        return true
      }
    }
    return false
  }

  let sanitized = text.replace(/\[([^\]]+)\]/g, (_match, rawContent) => {
    const tagContent = rawContent.trim().toLowerCase()
    const parts = tagContent.split(',').map(p => p.trim()).filter(Boolean)
    const normalized = []

    for (const part of parts) {
      let resolved = null

      if (approvedTags.has(part)) {
        resolved = part
      } else if (part in tagAliases) {
        const aliased = tagAliases[part]
        if (aliased) {
          resolved = aliased
        } else {
          stripped.push(part)
          continue
        }
      } else {
        stripped.push(part)
        warnings.push(`Unknown tag stripped: [${part}]`)
        continue
      }

      if (normalized.includes(resolved)) {
        warnings.push(`Duplicate tag in compound dropped: [${resolved}]`)
        continue
      }

      if (hasOverlap(normalized, resolved)) {
        warnings.push(`Overlapping tag dropped from compound: [${resolved}]`)
        continue
      }

      normalized.push(resolved)
    }

    if (normalized.length === 0) return ''

    if (normalized.length > 2) {
      warnings.push(`Compound tag truncated to 2: had ${normalized.length}`)
      normalized.length = 2
    }

    return `[${normalized.join(', ')}]`
  })

  sanitized = sanitized
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { sanitized, stripped, warnings }
}

// ─────────────────────────────────────────────
// FISH AUDIO TAG SYSTEM
// ─────────────────────────────────────────────

/**
 * Approved tags for Fish Audio S2 Pro.
 * Aligned with S2's published 33-tag library where possible.
 * Tags marked "free-form" are not curated but reliably interpreted by S2.
 */
const FISH_APPROVED_TAGS = new Set([
  'pause', 'short pause',
  'soft voice', 'low voice', 'whisper', 'exhale',
  'slow',
  'gentle', 'low volume',
  'emphasis',
])

const FISH_TAG_ALIASES = {
  'slowly':           'slow',
  'long pause':       'pause',
  'pausing':          'pause',
  'beat':             'short pause',

  'soft':             'low volume',
  'softly':           'low volume',
  'quiet':            'low volume',
  'quietly':          'low volume',
  'hushed':           'low volume',
  'low volume voice': 'low volume',

  'whispered':        'whisper',
  'whispering':       'whisper',
  'whisper softly':   'whisper',

  'low':              'low voice',
  'deep voice':       'low voice',
  'deeper voice':     'low voice',

  'gentle voice':     'soft voice',
  'soft tone':        'soft voice',

  'gently':           'gentle',
  'tender':           'gentle',
  'tenderly':         'gentle',
  'warm':             'gentle',
  'warmly':           'gentle',
  'calm':             'gentle',
  'calmly':           'gentle',
  'peaceful':         'gentle',
  'peacefully':       'gentle',
  'kindly':           'gentle',

  'emphasized':       'emphasis',
  'emphasised':       'emphasis',
  'stress':           'emphasis',

  'sigh':             'exhale',
  'sighs':            'exhale',
  'sighing':          'exhale',
  'breath':           'exhale',
  'breathe':          'exhale',
  'breathe out':      'exhale',
  'breathes out':     'exhale',

  // Banned — S2 curated tags that break bedtime atmosphere
  'excited':          null,
  'laughing':         null,
  'shouting':         null,
  'loud':             null,
  'angry':            null,
  'surprised':        null,
  'screaming':        null,
  'shocked':          null,
  'panting':          null,
  'sad':              null,
  'moaning':          null,
  'chuckling':        null,
  'singing':          null,
  'volume up':        null,

  // Banned — common LLM hallucinations unsafe to pass through
  'laugh':            null,
  'shout':            null,
  'crying':           null,
  'cry':              null,
  'sobbing':          null,
  'fearful':          null,
  'scared':           null,
  'dramatic':         null,
  'intense':          null,
  'urgent':           null,
}

const FISH_OVERLAP_GROUPS = [
  new Set(['low volume', 'soft voice', 'low voice', 'whisper']),
  new Set(['gentle', 'soft voice']),
]

function sanitizeFishAudioTags(text) {
  return _sanitizeTags(text, FISH_APPROVED_TAGS, FISH_TAG_ALIASES, FISH_OVERLAP_GROUPS)
}

/**
 * Full pre-processing pipeline for Fish Audio (emotion tags).
 *
 * @param {string} text — story body with LLM-embedded tags, title already stripped
 * @returns {{ text: string, stripped: string[], warnings: string[] }}
 */
function prepareTextForFishAudio(text) {
  let t = applyBaseTransforms(text.trim())
  const { sanitized, stripped, warnings } = sanitizeFishAudioTags(t)
  return { text: sanitized.trim(), stripped, warnings }
}

// ─────────────────────────────────────────────
// ELEVENLABS V3 TAG SYSTEM
// V3 uses natural-language bracket tags, not SSML.
// Structural breaks are embedded by the LLM; this pipeline sanitizes them.
// ─────────────────────────────────────────────

/**
 * Approved tags for ElevenLabs V3.
 * Based on V3's published tag library; "free-form" tags are natural-language
 * phrases V3 reliably interprets due to training frequency.
 */
const ELEVENLABS_V3_APPROVED_TAGS = new Set([
  // Structural (V3 adds [long pause] vs Fish Audio)
  'pause', 'short pause', 'long pause',

  // Voice register
  'whispers',

  // Pacing
  'slowly',

  // Breath / texture
  'sighs', 'sighs heavily',

  // Warmth (free-form, reliably interpreted)
  'softly',
])

/**
 * Aliases normalize common LLM variants to canonical V3 tags.
 * null = banned (silently stripped).
 *
 * Routing principle:
 *   - quiet / hushed / gentle variants  → softly
 *   - whisper variants                  → whispers
 *   - sigh / breath variants            → sighs
 *   - Fish Audio tags that may bleed in → nearest V3 equiv
 */
const ELEVENLABS_V3_TAG_ALIASES = {
  // Structural variants
  'pausing':          'pause',
  'beat':             'short pause',
  'long pause':       'long pause', // idempotent — already in approved set

  // Whisper variants
  'whisper':          'whispers',
  'whispering':       'whispers',
  'whispered':        'whispers',
  'whisper softly':   'whispers',
  'hushed':           'whispers',

  // Pacing
  'slow':             'slowly',

  // Breath variants
  'sigh':             'sighs',
  'sighing':          'sighs',
  'exhale':           'sighs',
  'breath':           'sighs',
  'breathe out':      'sighs',

  // Warmth / softness variants
  'gentle':           'softly',
  'gently':           'softly',
  'quietly':          'softly',
  'soft':             'softly',
  'tenderly':         'softly',
  'warmly':           'softly',
  'calmly':           'softly',

  // Fish Audio tags that may bleed through during a migration window
  'soft voice':       'softly',
  'low voice':        'whispers',
  'low volume':       'softly',
  'whisper':          'whispers',

  // Banned — V3 tags that activate and break bedtime atmosphere
  'laughs':           null,
  'laugh':            null,
  'laughing':         null,
  'laughs harder':    null,
  'starts laughing':  null,
  'chuckling':        null,
  'chuckles':         null,
  'shouts':           null,
  'shout':            null,
  'shouting':         null,
  'screaming':        null,
  'screams':          null,
  'crying':           null,
  'cry':              null,
  'sobbing':          null,
  'excited':          null,
  'angry':            null,
  'surprised':        null,
  'scared':           null,
  'fearful':          null,
  'mischievously':    null,
  'sarcastic':        null,
  'curious':          null,
  'singing':          null,
  'sings':            null,
  'clears throat':    null,
  'coughs':           null,
  'swallows':         null,
  'gulps':            null,
  'snorts':           null,
  'wheezing':         null,
  'woo':              null,
  'fart':             null,
  'applause':         null,
  'clapping':         null,
  'gunshot':          null,
  'explosion':        null,
  // Fish Audio energy tags that must never leak through
  'emphasis':         null,
  'loud':             null,
  'volume up':        null,
  'panting':          null,
  'moaning':          null,
  'sad':              null,
}

// [softly] and [whispers] both convey quiet/hushed delivery — only one should win per bracket.
const ELEVENLABS_V3_OVERLAP_GROUPS = [
  new Set(['softly', 'whispers']),
]

function sanitizeElevenLabsV3Tags(text) {
  return _sanitizeTags(text, ELEVENLABS_V3_APPROVED_TAGS, ELEVENLABS_V3_TAG_ALIASES, ELEVENLABS_V3_OVERLAP_GROUPS)
}

/**
 * Full pre-processing pipeline for ElevenLabs V3.
 *
 * V3 uses bracket emotion tags (not SSML). Structural breaks ([pause], [short pause],
 * [long pause]) and the sleep-ending softening ladder are embedded by the LLM at
 * generation time — this pipeline sanitizes and normalizes them.
 *
 * @param {string} text — story body with LLM-embedded V3 tags, title already stripped
 * @returns {{ text: string, stripped: string[], warnings: string[] }}
 */
function prepareTextForElevenLabsV3(text) {
  let t = applyBaseTransforms(text.trim())
  const { sanitized, stripped, warnings } = sanitizeElevenLabsV3Tags(t)
  return { text: sanitized.trim(), stripped, warnings }
}

// ─────────────────────────────────────────────
// SHARED TAG UTILITIES (provider-agnostic)
// ─────────────────────────────────────────────

/**
 * Returns tag count and density (tags per 100 words) for any bracket-tag format.
 */
function analyzeTagDensity(text) {
  const tagMatches = text.match(/\[[^\]]+\]/g) || []
  const wordCount = text.replace(/\[[^\]]+\]/g, '').trim().split(/\s+/).length
  return {
    count:   tagMatches.length,
    density: (tagMatches.length / wordCount) * 100,
  }
}

/**
 * Strips all bracket emotion tags for display in the reading view.
 */
function stripTagsForDisplay(text) {
  return text
    .replace(/\[[^\]]+\]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

module.exports = {
  // Primary pipelines
  prepareTextForTTS,          // ElevenLabs V2 / Azure TTS-HD (SSML)
  prepareTextForElevenLabsV3, // ElevenLabs V3 (bracket tags)
  prepareTextForFishAudio,    // Fish Audio S2 Pro (bracket tags)

  // Sanitizers (exposed for testing)
  sanitizeElevenLabsV3Tags,
  sanitizeFishAudioTags,

  // Utilities
  analyzeTagDensity,
  stripTagsForDisplay,

  // Constants
  VIBE_BREAK_MS,

  // Internal transforms (exposed for unit tests)
  _transforms: {
    normalizeEmDashes,
    normalizeEllipses,
    stripMarkdown,
    applyBaseTransforms,
    applyPronunciationDictionary,
    addSleepEndingBreaks,
    injectParagraphBreaks,
    sanitizeFishAudioTags,
    sanitizeElevenLabsV3Tags,
    analyzeTagDensity,
  },
}
