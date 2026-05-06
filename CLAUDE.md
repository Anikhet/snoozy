# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

```
snoozy/
  snoozy-android/   # Expo (React Native) app — primary codebase
  backend/          # Node.js/Express API server
  ios/              # Legacy Swift app (inactive)
```

Most active work is in `snoozy-android/`. See `snoozy-android/CLAUDE.md` for app-specific constraints and architecture.

## Backend (`backend/`)

### Commands
```bash
cd backend
npm run dev       # node --watch (auto-restart on save)
npm start         # production start
```

### Architecture
- Express + Clerk (`@clerk/express`) — all `/api/*` routes require a valid Clerk JWT via `requireAuth()`.
- Two routes: `POST /api/generate-story` (OpenAI/Azure chat → story text) and `POST /api/generate-audio` (ElevenLabs / OpenAI TTS / Azure TTS → MP3 buffer).
- TTS provider is selected at runtime via `TTS_PROVIDER` env var (`elevenlabs` | `openai` | `azure`).
- In-memory audio cache keyed by SHA-256 of `(processedText + voiceId)`, capped at 200 entries / 2h TTL. Swap for Redis above ~500 stories/day.
- Story text is pre-processed by `src/utils/ttsPreprocessor.js` before TTS (strips markdown, injects SSML break tags per vibe).
- Loudness normalization runs on ElevenLabs output via `src/utils/audioNormalizer.js`.
- Config loaded from `.env` via `src/config.js` — see `.env.example` for all keys.
- Deployed on Render (`render.yaml`); `rootDir: backend`.

### ElevenLabs voice resolution order
1. Explicit `voiceId` from the client request
2. Region-based default (`userRegion` → `REGION_VOICE_DEFAULTS` in `routes/story.js`)
3. Global fallback (Rachel)

## Frontend (`snoozy-android/`)

See `snoozy-android/CLAUDE.md` for the full guide. Summary:

- **Navigation**: Zustand field `currentScreen` + conditional `Animated.View` render in `App.tsx`. No React Navigation.
- **State**: Single Zustand store (`src/stores/storyStore.ts`) owns all screens, audio, and story generation.
- **Auth**: Clerk — `SignedIn`/`SignedOut` wrappers in `App.tsx`; JWT passed on every API call.
- **Storage**: `expo-file-system` for audio files + JSON story metadata; `AsyncStorage` for child profile and avatar URI.
- **Design tokens**: `src/config/tokens.ts` — use `Spacing.*`, `Radii.*`, `Fonts.*`, `Colors.*` consistently.
