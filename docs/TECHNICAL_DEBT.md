# Snoozy — Technical Debt & Code Quality Review

This document catalogs bugs, dead code, stale patterns, and missing infrastructure. Items are grouped by severity. Severity is about user impact and risk — not coding style.

---

## Critical (Fix Before Any Public Launch)

### ~~CRIT-1 — Live API Keys Committed to Git~~ ✅ RESOLVED

`backend/.env` was never committed — `backend/.gitignore` already excluded it. `.env.example` has been updated to reflect the full current schema (Azure chat + TTS, Fish Audio, ElevenLabs, Clerk, Stripe, Razorpay). `snoozy-android/.env` has been removed from git tracking and added to `.gitignore`. Recommend rotating all keys as a hygiene measure.

---

### ~~CRIT-2 — Favorite Button Broken in Player~~ ✅ RESOLVED

`StoryPlayerScreen.tsx` correctly calls `storyStore.toggleFavorite(currentStory.id)` and reads state from `currentStory.isFavorite`. No local state override.

---

### ~~CRIT-3 — Ambient Audio Slider is Misleading (Feature is Broken)~~ ✅ RESOLVED

All 6 ambient MP3s exist in `snoozy-android/assets/audio/ambient/` and all `require()` calls are active in `ambientAudioMap.ts`.

---

## High Severity (Fix Before Growth)

### ~~HIGH-1 — No Rate Limiting~~ ✅ RESOLVED

Per-user daily limits added via `express-rate-limit` keyed on Clerk `userId`:
- Story generation: **15/day**
- Audio generation: **30/day** (2× buffer for TTS retries)

Returns a clear 429 JSON message surfaced to the user on the failed story card.

---

### ~~HIGH-2 — Audio Cache Race Condition~~ ✅ RESOLVED

- Replaced `Map` + manual FIFO eviction with `LRUCache` (`lru-cache`) — eviction now by last-access time with automatic TTL expiry.
- Added in-flight deduplication on all three TTS providers (ElevenLabs, Fish Audio, Azure): concurrent cache misses for the same key piggyback on the first request's promise instead of making duplicate API calls.

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

### MED-1 — Dead Code: Dark Mode System (Keep, Planned)

**Files:** `snoozy-android/src/config/tokens.ts`, `snoozy-android/App.tsx`, `snoozy-android/src/hooks/useThemeColors.ts`

A full dark mode color system is defined in tokens but is force-disabled:
```typescript
// App.tsx
const isDark = false  // forced light mode
```

`useThemeColors()` always returns light colors. The dark mode token map is never used. The `isDark` variable is passed through screens but has no effect.

**Decision:** Keeping intentionally — dark mode is planned for a future release. Dead code does not affect App Store review. Wire to `useColorScheme()` when ready to ship.

---

### ~~MED-2 — Duplicate FFmpeg Logic~~ ✅ RESOLVED

Both FFmpeg pipelines now share `src/utils/ffmpegUtils.js` (runFfmpeg, FFMPEG_AVAILABLE, tempFile helpers). No duplication. This was done in the same commit that fixed MED-4 and MED-5.

**Files:** `backend/src/utils/audioNormalizer.js` (ElevenLabs path) and `backend/src/routes/story.js` `applyBedtimeProcessing()` (Fish Audio path)

Both implement FFmpeg audio processing with temp files, timeouts, and graceful fallback. Neither reuses the other's infrastructure. FFMPEG_AVAILABLE is independently detected twice (once at module load in `audioNormalizer.js`, once at call time in `applyBedtimeProcessing()`).

**Fix:** Extract shared FFmpeg utilities (runFfmpeg, FFMPEG_AVAILABLE, tempFile helpers) into a `src/utils/ffmpegUtils.js` module used by both pipelines.

---

### ~~MED-3 — Azure TTS Remnants~~ ✅ RESOLVED

Azure TTS is now fully implemented (`generateWithAzureTTS()` in `story.js`) using the `tts-hd` deployment. Stale comment referencing "Azure TTS" as a planned-but-missing feature has been removed. `.env.example` is accurate with both chat and TTS deployment vars.

---

### ~~MED-4 — Stale `TTS_PROVIDER` Environment Variable~~ ✅ RESOLVED

Removed from `.env.example`. `CLAUDE.md` updated to reflect the correct behaviour: provider is sent per-request by the client via the `provider` field in the request body.

---

### ~~MED-5 — `useRegion.ts` Is an Empty Stub~~ ✅ RESOLVED

Hook is fully implemented using the `Intl` API (no permissions, no network). Actively used in `SnoozyPlusScreen` for region-based logic (India detection for pricing). The debt doc was written against an earlier version.

---

### ~~MED-6 — `paymentService.ts` Is Minimal / Incomplete~~ ✅ RESOLVED

`paymentService.ts` now has fully-architected Stripe and Razorpay flows with correct backend handshake, provider-agnostic `PaymentOutcome` type, and dev-mode placeholder blocks. Activating either provider requires installing the native SDK and wiring backend payment endpoints — the structure is ready.

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
| ~~Rate limiting~~ ✅ | P0 | 15 stories/day + 30 audio/day per user |
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
| Audio pipeline | 8/10 | Three providers, LRU cache, in-flight dedup; ambient working |
| Frontend UX flow | 7/10 | Clean but several broken interactions |
| State management | 7/10 | Zustand well-used, some sync bugs |
| Backend architecture | 7/10 | Rate limiting added, cache improved, Azure TTS live |
| Security | 7/10 | .env never committed; keys not in git; voice clones still public (HIGH-4) |
| Test coverage | 0/10 | None |
| Monetization | 0/10 | Not implemented |
