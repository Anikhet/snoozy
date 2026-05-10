# Snoozy — Architecture & Structure

## What is Snoozy?

Snoozy is a personalized AI bedtime story app. A parent sets up a child profile (name, age, pronouns), picks a world and emotional vibe, and the app generates a unique ~700-word story narrated in a chosen voice — including the parent's own cloned voice. The core proposition: a child hears a personalized story in their parent's voice even when that parent isn't physically present.

---

## Repository Layout

```
snoozy/
├── backend/              # Node.js/Express API server
│   ├── src/
│   │   ├── index.js          # Server entry point
│   │   ├── config.js         # Env var loader (frozen config object)
│   │   ├── middleware/
│   │   │   └── validate.js   # Zod schema validation middleware
│   │   ├── prompts/
│   │   │   └── templates.js  # Story prompt templates, world/vibe definitions (652 lines)
│   │   ├── routes/
│   │   │   └── story.js      # All API endpoints (658 lines)
│   │   └── utils/
│   │       ├── audioNormalizer.js    # EBU R128 loudness normalization via FFmpeg
│   │       └── ttsPreprocessor.js   # Text pre-processing for TTS providers
│   └── scripts/
│       └── generate-ambient.js      # One-time script: generate ambient audio for all worlds
│
├── snoozy-android/       # Expo (React Native) app — primary codebase
│   ├── App.tsx               # Entry point, auth shell, screen switcher
│   ├── src/
│   │   ├── config/           # Tokens, story options, voices, ambient map, app config
│   │   ├── types/            # TypeScript interfaces (Story, Voice, Subscription, Screen)
│   │   ├── stores/
│   │   │   └── storyStore.ts # Single Zustand store — all app state
│   │   ├── services/         # API calls, audio playback, storage, notifications, payments
│   │   ├── hooks/            # useBackHandler, useThemeColors, useRegion (stub)
│   │   ├── components/       # BottomTabBar, StoryCoverTile, Visuals, Chip, etc.
│   │   └── screens/          # 18 screens (full list below)
│   └── assets/
│       ├── images/worlds/    # Static world illustration tiles
│       └── audio/ambient/    # Ambient MP3 files (not yet populated)
│
└── ios/                  # Legacy Swift app — inactive, not maintained
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Expo (React Native, SDK 52) | Managed workflow, EAS Build |
| **Language** | TypeScript | Strict mode |
| **State** | Zustand | Single store, no Redux |
| **Navigation** | Custom enum + Animated.View | No React Navigation |
| **Auth** | Clerk | JWT, social login (Apple, Google) |
| **Fonts** | Nunito (400–700) | Loaded via expo-google-fonts |
| **Animations** | react-native-reanimated v3 | FadeIn, SlideIn, shared values |
| **Gestures** | react-native-gesture-handler | Pan, Tap, swipe-back |
| **Audio Playback** | expo-audio | Background audio mode |
| **Storage** | AsyncStorage + expo-file-system | Metadata + audio binary |
| **Notifications** | expo-notifications | Bedtime reminders |
| **Backend** | Node.js 20 / Express 4 | Deployed on Render |
| **AI Stories** | OpenAI gpt-4o | `temperature: 0.9`, `max_tokens: 1100` |
| **TTS - Primary** | Fish Audio S2 Pro | Voice cloning, emotion tags |
| **TTS - Secondary** | ElevenLabs | SSML breaks, per-vibe voice settings |
| **Auth (server)** | @clerk/express + requireAuth | All /api routes protected |
| **Validation** | Zod | Schemas on all POST bodies |
| **Audio post-processing** | FFmpeg | Loudness normalization, bedtime EQ |
| **Container** | Docker / Node 20 Alpine | render.yaml rootDir: backend |

---

## Backend Architecture

### Entry Point & Middleware Stack

```
Request
  → helmet()           (security headers)
  → cors()             (all origins — needs tightening)
  → express.json()     (1 MB limit)
  → clerkMiddleware()  (attaches auth context)
  → requireAuth()      (rejects unauthenticated on /api/*)
  → validate(schema)   (Zod, returns 400 on bad input)
  → route handler
  → global error handler (500 fallback)
```

### API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Unauthenticated health check |
| `POST` | `/api/generate-story` | OpenAI gpt-4o → story text + title |
| `POST` | `/api/generate-audio` | ElevenLabs or Fish Audio → MP3 (base64) |
| `POST` | `/api/create-voice-clone` | Upload audio → Fish Audio voice model |
| `DELETE` | `/api/voice-clone/:id` | Remove voice model from Fish Audio |

### Story Generation Pipeline

```
Client sends: { worldId, vibeId, childDetails }
                    ↓
         buildPrompt(world, vibe, child)
           (templates.js — ~550 word system prompt)
                    ↓
         OpenAI gpt-4o (temp 0.9, max_tokens 1100)
                    ↓
         Extract title from first line (< 80 chars) or
         synthesize from story body if none
                    ↓
         Return { title, storyText }
```

The system prompt encodes:
- Child's name, age, pronouns, world context, vibe's emotional arc
- Age-gated vocabulary (4 tiers: ≤3, ≤5, ≤7, 8-10)
- Strict word count (600–750 words), 5-section structure
- TTS-aware writing rules (avoid heteronyms, prefer soft phonemes)
- Mandatory emotion tags for Fish Audio (approved list only)
- Mandatory "signature moment" — one original magical detail per story

### Audio Generation Pipeline

```
Client sends: { text, voiceId, provider: 'elevenlabs'|'fishaudio', vibeId }
                    ↓
         SHA-256(processedText + voiceId)  ← cache key
         In-memory Map (200 entries, 2h TTL)
                    ↓  cache miss
         ttsPreprocessor.js
           ElevenLabs path: stripMarkdown → pronunciation dict → SSML breaks
           Fish Audio path: stripMarkdown → sanitize emotion tags
                    ↓
         TTS API call
           ElevenLabs: mp3_44100_128, speed 0.88, vibe-tuned stability/style
           Fish Audio: mp3 192kbps, speed 0.92, temp 0.6, top_p 0.7
                    ↓
         FFmpeg post-processing
           ElevenLabs: EBU R128 -18 LUFS, lowpass 8kHz, fade in/out
           Fish Audio: bedtime filter — lowpass 12kHz, tempo warp tail, fade
                    ↓
         Return MP3 buffer → base64 to client
```

### Voice Cloning Pipeline

```
Client sends: multipart/form-data { audio: File, name: String }
                    ↓
         multer (max 20 MB, allowed: wav/mp3/flac/webm)
                    ↓
         createCoverPng()  ← minimal 1×1 PNG, pure JS (no sharp/jimp)
                    ↓
         POST to Fish Audio /model  (multipart)
                    ↓
         Return { voiceModelId, state }
         (state='trained' is async — Fish Audio completes training in background)
```

### In-Memory Audio Cache

```javascript
audioCache = Map<string, { buffer: Buffer, timestamp: number }>
MAX_ENTRIES = 200
TTL = 2 hours
Eviction: delete oldest key (Map insertion order) when at capacity
```

Key is SHA-256 of `(processedText + voiceId)` — vibe-aware because preprocessing applies vibe-specific SSML timings before hashing.

---

## Frontend Architecture

### Navigation Model

There is **no React Navigation**. All screens are stacked `Animated.View` components conditionally rendered based on `storyStore.currentScreen`. Transitions are Reanimated `FadeIn`/`SlideIn` presets. Navigation direction (`navDir: 'forward' | 'back'`) determines slide direction.

```
App.tsx
  └── SignedIn / SignedOut (Clerk)
        ├── SplashScreen
        ├── ChildProfileScreen  (first-run onboarding)
        └── Main Navigation
              ├── HomeScreen
              ├── WorldPickerScreen
              ├── VibePickerScreen
              ├── GeneratingScreen
              ├── StoryPlayerScreen
              ├── StoryEndScreen
              ├── LibraryScreen
              ├── InsightsScreen
              └── ProfileScreen
                    ├── AccountDetailsScreen
                    ├── PasswordSecurityScreen
                    ├── BedtimeReminderScreen
                    ├── StoryPreferencesScreen
                    ├── FavoriteThemesScreen
                    ├── VoiceSetupScreen
                    └── SnoozyPlusScreen
```

### State Management

Single Zustand store (`src/stores/storyStore.ts`). All screens read from and write to this store. No local component state for business logic — only UI-local state (e.g. scroll position, dropdown open).

**Store slices (logical groupings):**

| Slice | Key Fields |
|-------|-----------|
| Navigation | `currentScreen`, `navDir` |
| Child Profile | `childDetails`, `onboardingDefaults` |
| Generation | `selectedWorldId`, `selectedVibeId`, `generatingStoryId` |
| Stories | `savedStories`, `currentStory` |
| Audio Playback | `isPlaying`, `currentTime`, `duration`, `ambientVolume` |
| Sleep Timer | `sleepTimerRemaining` |
| Voice Profiles | `voiceProfiles` |
| Subscription | `subscription` |
| UI | `editingProfile`, `profilePanel` |

### Story Generation Flow (Frontend)

```
User taps "Create Story"
        ↓
storyStore.generateStory(vibeId, getToken)
        ↓
createPlaceholderStory()  →  savedStories (status: Generating)
        ↓
Navigate to GeneratingScreen
        ↓
runGeneration() [background, AbortController keyed by storyId]
  ├── apiService.generateStory(world, vibe, child, token)     → { title, storyText }
  ├── apiService.generateAudio(storyText, voiceId, token)     → base64 MP3
  ├── storageService.saveAudioFile(base64)                    → file:// URI
  └── Update placeholder story: status → Ready, audioFileName set
        ↓
GeneratingScreen detects Ready → flash overlay → navigate to Player
```

### Audio Service

```
audioService.ts wraps expo-audio's createAudioPlayer()

Key behaviors:
- Background playback mode enabled on init
- loadAndPlay(uri)      → creates new player instance, attaches event listeners
- Sleep timer          → countdown interval, 30s fade-out before end
- Completion detection → was playing, now stopped, at end of duration
```

### Persistence Layer

```
AsyncStorage:
  STORIES_KEY        → Story[] (metadata only, no audio binary)
  CHILD_PROFILE_KEY  → ChildDetails
  VOICE_PROFILES_KEY → VoiceProfile[]
  AMBIENT_VOLUME_KEY → number (0..1)

expo-file-system:
  FileSystem.documentDirectory/Audio/{storyId}.mp3  → audio binaries
```

### Design System

All visual constants live in `src/config/tokens.ts`:

```
Colors   → background (#FBF5EC), ink (#2B2130), primary (#5B5BD6),
           8 card gradient pairs (Lavender, Peach, Mint, Ocean, Cosmos, Rose, Snow, Rain)
Spacing  → xs(4) sm(8) md(16) lg(24) xl(32) xxl(48)
Radii    → field(14) small(12) button(18) card(20) cardLarge(28)
Fonts    → Nunito, 400–700 weight, sizes 11–38px
```

Dark mode is defined in tokens but force-disabled (`const isDark = false` in App.tsx).

### Key Architectural Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| Custom navigation via Zustand | Simpler for a linear flow with few screens | Harder to deep-link; no navigation history stack |
| Single Zustand store | Prevents prop-drilling through deep trees | Store grows large; harder to code-split |
| In-memory audio cache on server | Avoids re-generating identical audio | Lost on restart; no persistence across deploys |
| Base64 audio over the wire | Simple, no signed URLs needed | ~33% larger payload vs binary; fine at current scale |
| Fish Audio S2 Pro as primary TTS | Best voice cloning quality available | Requires FFmpeg for post-processing; niche API |
| Static bundled world images | Reliable offline | Can't A/B test or update without a new app build |
