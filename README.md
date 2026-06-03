# Snoozy

Personalized bedtime stories for kids — read aloud in a parent's (or grandparent's) own voice.

Snoozy generates a fresh, age-appropriate bedtime story tailored to a child's name, chosen world, and mood ("vibe"), then narrates it with text-to-speech. With voice cloning, the story can be read in the voice of someone the child loves — even when that person isn't physically there.

> A child hearing their own mom or dad reading a personalized story when the parent isn't present isn't a TTS feature — it's the entire product proposition.

## Repository layout

```
snoozy/
  snoozy-android/   # Expo (React Native) mobile app — primary codebase
  backend/          # Node.js / Express API server
  ios/              # Legacy Swift app (inactive)
  docs/             # Architecture, system design, product notes
```

## How it works

1. The parent signs in and sets up a child profile (name, age, pronouns, voice).
2. They pick a **world** and a **vibe** for tonight's story.
3. The app calls the backend to **generate the story text** (LLM).
4. The app calls the backend to **generate narration audio** (TTS), which is cached and streamed back.
5. The story is saved locally and plays back with audio controls; finished stories live in the library.

```
HomeScreen → WorldPicker → VibePicker → Generating (story → audio → save) → StoryPlayer → StoryEnd
```

## Frontend — `snoozy-android/`

An [Expo](https://expo.dev) / React Native app (TypeScript).

**Stack highlights**
- **Navigation:** no React Navigation — a single Zustand field `currentScreen` drives conditional `Animated.View` rendering in `App.tsx`.
- **State:** one global Zustand store (`src/stores/storyStore.ts`) owns screens, child details, saved stories, audio playback, and the generation pipeline.
- **Auth:** [Clerk](https://clerk.com) (`@clerk/clerk-expo`) — `SignedIn` / `SignedOut` wrappers; the JWT is attached to every backend call.
- **Storage:** `expo-file-system` for audio + story JSON; `AsyncStorage` for the child profile and avatar.
- **Design tokens:** `src/config/tokens.ts` — use `Spacing.*`, `Radii.*`, `Fonts.*`, `Colors.*`.

**Commands**
```bash
cd snoozy-android
npx expo start          # start the Metro dev server
npx expo run:android    # build & run on Android device/emulator
npx expo run:ios        # build & run on the iOS simulator
npx tsc --noEmit        # TypeScript type-check
```

> There is no lint script or test suite configured for the app.

See [`snoozy-android/CLAUDE.md`](snoozy-android/CLAUDE.md) for full architecture and styling constraints (e.g. **no shadows**, **Nunito font only**, consistent `Spacing.*` tokens).

## Backend — `backend/`

An Express API that proxies the LLM and TTS providers and protects the keys.

**Endpoints** (all under `/api`, JWT-protected via Clerk `requireAuth()`):
- `POST /api/generate-story` — Azure OpenAI chat → returns `{ title, storyText }`.
- `POST /api/generate-audio` — ElevenLabs **or** Fish Audio TTS → returns an MP3 buffer.
- `GET /health` — liveness check.

**Notable details**
- TTS provider is selected per-request by the client via the `provider` field (`elevenlabs` | `fishaudio`).
- Story text is pre-processed in `src/utils/ttsPreprocessor.js` (strips markdown, injects SSML break tags per vibe).
- ElevenLabs output is loudness-normalized via `src/utils/audioNormalizer.js`.
- In-memory audio cache keyed by SHA-256 of `(processedText + voiceId)`, capped at 200 entries / 2h TTL — swap for Redis above ~500 stories/day.
- Per-user rate limits: 15 stories/day and 30 audio requests/day.
- ElevenLabs voice resolution order: explicit `voiceId` → region default (`REGION_VOICE_DEFAULTS`) → global fallback (Rachel).

**Commands**
```bash
cd backend
npm install
npm run dev    # node --watch (auto-restart on save)
npm start      # production start
```

**Configuration**

Copy `backend/.env.example` to `backend/.env` and fill in the keys:

| Variable | Purpose |
| --- | --- |
| `AZURE_OPENAI_API_KEY` / `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_CHAT_DEPLOYMENT` | Story generation (required) |
| `AZURE_OPENAI_TTS_DEPLOYMENT` | Azure TTS deployment |
| `FISH_API_KEY` / `FISH_AUDIO_VOICE_ID` | Fish Audio TTS + voice cloning |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` | ElevenLabs TTS |
| `CLERK_SECRET_KEY` | Clerk auth (backend secret key) |
| `STRIPE_SECRET_KEY` | Stripe payments |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay payments (India) |

Config is loaded from `.env` via `src/config.js`. The service deploys on [Render](https://render.com) (`render.yaml`, `rootDir: backend`).

## Documentation

More detail lives in [`docs/`](docs/):
- [`ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md)
- [`PRODUCT_ANALYSIS.md`](docs/PRODUCT_ANALYSIS.md)
- [`TECHNICAL_DEBT.md`](docs/TECHNICAL_DEBT.md)

## License

Proprietary — all rights reserved.
