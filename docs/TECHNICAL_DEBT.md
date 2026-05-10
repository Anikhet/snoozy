# Snoozy — Technical Debt & Code Quality Review

This document catalogs bugs, dead code, stale patterns, and missing infrastructure. Items are grouped by severity. Severity is about user impact and risk — not coding style.

---

## Critical (Fix Before Any Public Launch)

### CRIT-1 — Live API Keys Committed to Git

**File:** `backend/.env`

Real secrets are committed to the repository:
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`
- `FISH_API_KEY` + `FISH_AUDIO_VOICE_ID`
- `AZURE_OPENAI_API_KEY` (unused but real)
- `CLERK_SECRET_KEY`

**Risk:** Any developer with repo access can call paid APIs on the company account. If the repo is ever public, these are immediately scraped by bots.

**Fix:**
```bash
# Rotate all keys immediately via each provider's dashboard
# Remove from git history:
git rm --cached backend/.env
echo "backend/.env" >> .gitignore
git commit -m "remove committed .env"
git filter-repo --path backend/.env --invert-paths  # purge from history
```

---

### CRIT-2 — Favorite Button Broken in Player

**File:** `snoozy-android/src/screens/StoryPlayerScreen.tsx`

The favorite/heart button maintains a local `isFavorited` state variable but never calls `storyStore.toggleFavorite()`. Tapping the button shows a heart fill animation. On screen reload or app restart, the story is not favorited in storage.

**Impact:** Users lose favorites. The Library filter "Favorites" shows nothing they thought they saved.

**Fix:** Replace local state toggle with `storyStore.toggleFavorite(storyId)` call, and initialize local state from `currentStory.isFavorite`.

---

### CRIT-3 — Ambient Audio Slider is Misleading (Feature is Broken)

**File:** `snoozy-android/src/config/ambientAudioMap.ts`

All 6 ambient audio entries are `null`:
```typescript
const AMBIENT_AUDIO_MAP = {
  forest: null,   // require('./assets/audio/ambient/ambient-forest.mp3')
  ocean: null,
  space: null,
  // ...
}
```

The UI shows a volume slider on the player screen. `ambientAudioService.startAmbient()` is called when a story starts. The service tries to load `null`, silently fails, and nothing plays. The user moves the slider and nothing happens.

**Impact:** Users see a broken feature with no explanation. This is Snoozy's second-biggest selling point after voice cloning.

**Fix:** Run `node backend/scripts/generate-ambient.js` for all 6 worlds (requires `ELEVENLABS_API_KEY`), commit the generated MP3s to `snoozy-android/assets/audio/ambient/`, and un-comment the require statements in `ambientAudioMap.ts`.

---

## High Severity (Fix Before Growth)

### HIGH-1 — No Rate Limiting

**File:** `backend/src/index.js`

There is no per-user or per-IP rate limiting on any endpoint. A user can call `/api/generate-audio` in a tight loop and burn through the TTS API budget in minutes. ElevenLabs and Fish Audio both charge per character.

**Fix:** Add `express-rate-limit` with per-user limits:
```javascript
import rateLimit from 'express-rate-limit'
const audioLimit = rateLimit({ windowMs: 60_000, max: 10, keyGenerator: (req) => req.auth().userId })
app.use('/api/generate-audio', audioLimit)
```

---

### HIGH-2 — Audio Cache Race Condition

**File:** `backend/src/routes/story.js`

```javascript
if (audioCache.size >= CACHE_MAX_ENTRIES) {
  const oldestKey = audioCache.keys().next().value   // not reliable LRU
  audioCache.delete(oldestKey)
}
audioCache.set(key, { buffer, timestamp: Date.now() })
```

JavaScript's `Map` preserves insertion order, so `.keys().next().value` does return the oldest-inserted key. But there's no lock — two concurrent cache misses for the same key can both call the TTS API and the second one overwrites the first. This is a minor efficiency issue, not a correctness bug, but worth noting.

The bigger issue: eviction deletes by insertion order, not by last-access time. This is FIFO, not LRU. A hot entry added early will be evicted before a cold one added recently.

**Fix:** Use a proper LRU library (`lru-cache`) or track `lastAccessed` alongside `timestamp`.

---

### HIGH-3 — No TTS Fallback

If ElevenLabs returns 5xx or Fish Audio returns 5xx, the request fails immediately. There's no automatic retry or fallback to the other provider.

**Fix:** Add retry with exponential backoff for 429/503 on TTS calls. Consider falling back to the other provider on sustained failure.

---

### HIGH-4 — Voice Clones Created as Public

**File:** `backend/src/routes/story.js`

```javascript
formData.append('visibility', 'public')
```

Voice clones (recordings of parents' voices) are uploaded to Fish Audio as public models. This potentially exposes them to other Fish Audio users.

**Fix:** Change to `'private'`.

---

### HIGH-5 — No Push Notification When Voice Clone is Ready

**File:** `snoozy-android/src/screens/VoiceSetupScreen.tsx`

After uploading a voice sample, training is async on Fish Audio's side (can take minutes). The app returns the user to the profile screen with no feedback. There is no polling, webhook, or push notification for completion.

**Impact:** Users don't know when their voice clone is ready to use. They may select it before training completes, getting a bad output.

**Fix:** Poll `/api/voice-clone/:id` status in the background after creation, send a local push notification when `state === 'trained'`.

---

## Medium Severity (Technical Debt)

### MED-1 — Dead Code: Dark Mode System

**Files:** `snoozy-android/src/config/tokens.ts`, `snoozy-android/App.tsx`, `snoozy-android/src/hooks/useThemeColors.ts`

A full dark mode color system is defined in tokens but is force-disabled:
```typescript
// App.tsx
const isDark = false  // forced light mode
```

`useThemeColors()` always returns light colors. The dark mode token map is never used. The `isDark` variable is passed through screens but has no effect.

**Options:**
- If dark mode is planned: remove `const isDark = false` and wire to `useColorScheme()` properly
- If not planned for 6+ months: delete the dark token map, remove `isDark` from the hook and all props

---

### MED-2 — Duplicate FFmpeg Logic

**Files:** `backend/src/utils/audioNormalizer.js` (ElevenLabs path) and `backend/src/routes/story.js` `applyBedtimeProcessing()` (Fish Audio path)

Both implement FFmpeg audio processing with temp files, timeouts, and graceful fallback. Neither reuses the other's infrastructure. FFMPEG_AVAILABLE is independently detected twice (once at module load in `audioNormalizer.js`, once at call time in `applyBedtimeProcessing()`).

**Fix:** Extract shared FFmpeg utilities (runFfmpeg, FFMPEG_AVAILABLE, tempFile helpers) into a `src/utils/ffmpegUtils.js` module used by both pipelines.

---

### MED-3 — Azure TTS Remnants

**Files:** `backend/.env`, `backend/src/config.js`, comments throughout

Azure OpenAI TTS was planned but never implemented. The `.env` contains 6 Azure variables. `config.js` doesn't load them. Multiple comments reference "Azure" in the route file.

**Fix:** Delete Azure env vars from `.env.example`. Remove all Azure comment references. The Azure route is not implemented — don't create false expectations.

---

### MED-4 — Stale `TTS_PROVIDER` Environment Variable

**File:** `backend/.env`, `backend/CLAUDE.md` references

The `CLAUDE.md` (root) says: "TTS provider is selected at runtime via `TTS_PROVIDER` env var." This is no longer true — provider is sent per-request from the client. The env var is loaded in `.env` but never read by `config.js` or any route.

**Fix:** Remove from `.env.example` and update CLAUDE.md.

---

### MED-5 — `useRegion.ts` Is an Empty Stub

**File:** `snoozy-android/src/hooks/useRegion.ts`

This hook exists and is referenced but has no implementation. No imports, no logic.

**Fix:** Either implement it (for region-based voice defaults) or delete it.

---

### MED-6 — `paymentService.ts` Is Minimal / Incomplete

**File:** `snoozy-android/src/services/paymentService.ts`

Payment service exists but does nothing meaningful. The subscription types are defined, the SnoozyPlusScreen exists, but there's no RevenueCat SDK, StoreKit 2, or Google Billing integration.

**Impact:** The app has no monetization path. This is fine for MVP but needs to be tracked as a known gap.

---

### MED-7 — Story Generation AbortController Keyed by storyId

**File:** `snoozy-android/src/stores/storyStore.ts`

```typescript
const abortControllers = new Map<string, AbortController>()
```

AbortControllers are stored in a module-level Map. If the user somehow triggers two generations simultaneously, the second would cancel the first. There's no UI-level guard against double-taps on "Create Story."

**Fix:** Disable the "Create Story" button while `generatingStoryId` is set (likely already done — confirm in UI).

---

### MED-8 — Failed Stories Accumulate in Library

When story generation fails, a placeholder `Story` with `status: 'Failed'` remains in `savedStories`. There's no auto-cleanup. The Library screen shows it with no recovery action (no retry button, no explanation).

**Fix:** Add a retry action to Failed story cards. Auto-delete Failed stories after 24 hours.

---

### MED-9 — No Pagination in Library

**File:** `snoozy-android/src/screens/LibraryScreen.tsx`

The library renders all stories in a `FlatList` (2-column grid) with no pagination or virtualization limit. At 50+ stories this will cause jank. At 200+ stories it could OOM on low-end Android devices.

**Fix:** Add `initialNumToRender={20}` and `windowSize={5}` to FlatList props. For 100+ stories, consider server-side pagination.

---

## Low Severity (Polish)

### LOW-1 — "More Options" Button Does Nothing

**File:** `snoozy-android/src/screens/StoryPlayerScreen.tsx`

```typescript
<TouchableOpacity onPress={() => {}}>  // empty handler
  <Text>•••</Text>
</TouchableOpacity>
```

The button is visible to users. It does nothing.

**Fix:** Remove it or implement it (delete story, share, report issue).

---

### LOW-2 — Waveform Scrubber Is Decorative

**File:** `snoozy-android/src/components/Visuals.tsx` — `WaveformScrubber`

The scrubber renders 56 bars with simulated amplitude values. It is not driven by actual audio waveform data. It functions as a progress bar with aesthetic flair.

This is acceptable MVP behavior, but worth noting for future: if real waveform rendering is desired, `expo-av`'s `getStatusAsync` doesn't expose waveform data — a native module or server-side precomputation would be needed.

---

### LOW-3 — Hardcoded Colors Outside Token System

Several screen files contain hardcoded hex values that should reference design tokens:
- `StoryPlayerScreen.tsx`: `'#FF6B8A'` (heart icon color)
- Various `rgba()` calls with hardcoded values

This isn't a bug but causes inconsistency when updating the design.

---

### LOW-4 — `CLERK_PUBLISHABLE_KEY` Loaded in Config but Never Used

**File:** `backend/src/config.js`

```javascript
clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
```

The publishable key is for frontend SDKs. The backend only needs `CLERK_SECRET_KEY`. Loading the publishable key here is harmless but confusing.

---

### LOW-5 — `createCoverPng` Manual CRC32 Implementation

**File:** `backend/src/routes/story.js`

A 40-line manual PNG chunk generator with CRC32 checksums is used to produce a 1×1 solid-color PNG for voice clone thumbnails. This is clever (zero dependencies) but fragile.

Any mistake in the CRC32 algorithm would produce an invalid PNG that Fish Audio might reject. The code has been stable, so this is low risk — but a future developer changing it risks corruption.

**Fix if touching this code:** Replace with `Buffer.from('iVBORw0KGgo=...', 'base64')` — a pre-generated minimal PNG constant. No runtime computation needed.

---

### LOW-6 — Text Bracket Stripping Could Corrupt Story Text

**File:** `snoozy-android/src/stores/storyStore.ts`

```typescript
const cleaned = storyText
  .replace(/\[.*?\]/g, '')  // strips [anything in brackets]
```

This is intended to remove Fish Audio emotion tags like `[whisper]`. But if OpenAI ever generates legitimate bracketed content in the story (e.g. a character named "[Star]" or a note to the reader), it will be silently deleted.

**Fix:** Strip only known emotion tags rather than all brackets:
```typescript
const knownTags = ['pause', 'soft', 'whisper', 'slow', 'exhale', 'gentle', ...]
const tagPattern = new RegExp(`\\[(${knownTags.join('|')})\\]`, 'gi')
```

---

## Missing Infrastructure (Not Debt, But Gaps to Acknowledge)

| Gap | Priority | Notes |
|-----|----------|-------|
| Rate limiting | P0 | Cost control and abuse prevention |
| Structured logging | P1 | Currently console.log only |
| Error tracking (Sentry) | P1 | No visibility into production errors |
| Analytics (PostHog/Mixpanel) | P1 | No usage data |
| Payment integration | P1 | No revenue mechanism |
| CORS whitelist | P1 | Currently allows all origins |
| Multi-child profiles | P2 | Single ChildDetails object |
| Story sharing / export | P2 | No way to send a story |
| Server-side story storage | P2 | Stories are device-local only |
| TTS provider fallback | P2 | If Fish Audio down, no fallback |
| Voice clone "ready" notification | P2 | Async training with no callback |
| Offline playback validation | P3 | Should work but untested |
| Unit / integration tests | P3 | Zero test coverage |

---

## Summary Scorecard

| Area | Score | Notes |
|------|-------|-------|
| Story prompt quality | 9/10 | Exceptional — genuine craft |
| Audio pipeline | 7/10 | Mature, but ambient broken and no fallback |
| Frontend UX flow | 7/10 | Clean but several broken interactions |
| State management | 7/10 | Zustand well-used, some sync bugs |
| Backend architecture | 6/10 | Good structure, missing rate limit + observability |
| Security | 3/10 | Live secrets committed to git — must fix |
| Test coverage | 0/10 | None |
| Monetization | 0/10 | Not implemented |
