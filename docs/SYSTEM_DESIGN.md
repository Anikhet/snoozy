# Snoozy — System Design

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Expo RN)                        │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────┐  │
│  │ Zustand  │  │  expo-audio  │  │AsyncStore │  │expo-file │  │
│  │  Store   │  │  (playback)  │  │(metadata) │  │ system   │  │
│  └────┬─────┘  └──────────────┘  └───────────┘  │ (audio)  │  │
│       │                                          └──────────┘  │
│  ┌────▼──────────────────────────┐                             │
│  │         apiService.ts         │                             │
│  │  Bearer token (Clerk JWT)     │                             │
└──┼───────────────────────────────┼─────────────────────────────┘
   │           HTTPS               │
   ▼                               │
┌──────────────────────────────────▼──────────────────────────────┐
│                   BACKEND (Express on Render)                    │
│                                                                  │
│  helmet → cors → json → clerkMiddleware → requireAuth → routes  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    routes/story.js                       │    │
│  │                                                          │    │
│  │  POST /api/generate-story   POST /api/generate-audio    │    │
│  │  POST /api/create-voice-clone                           │    │
│  │  DELETE /api/voice-clone/:id                            │    │
│  └──────────┬────────────────────┬────────────────────────┘    │
│             │                    │                               │
│  ┌──────────▼──┐      ┌──────────▼──────────────────────────┐  │
│  │  OpenAI     │      │         Audio Cache                  │  │
│  │  gpt-4o     │      │   Map<SHA256, {buffer, timestamp}>   │  │
│  │             │      │   200 entries, 2h TTL                │  │
│  └─────────────┘      └──────────┬──────────────────────────┘  │
│                                  │ cache miss                    │
│                       ┌──────────▼──────────────────────────┐  │
│                       │     ttsPreprocessor.js               │  │
│                       │  stripMarkdown → SSML/tags           │  │
│                       └──────────┬──────────────────────────┘  │
│                                  │                               │
│                    ┌─────────────┼──────────────┐               │
│                    ▼             │              ▼                │
│           ┌──────────────┐       │    ┌──────────────────┐      │
│           │  ElevenLabs  │       │    │   Fish Audio     │      │
│           │  TTS API     │       │    │   S2 Pro API     │      │
│           └──────┬───────┘       │    └───────┬──────────┘      │
│                  │               │            │                  │
│                  ▼               │            ▼                  │
│           ┌──────────────┐       │    ┌──────────────────┐      │
│           │ audioNormali │       │    │ applyBedtime     │      │
│           │ zer.js       │       │    │ Processing()     │      │
│           │ (EBU R128)   │       │    │ (custom EQ)      │      │
│           └──────┬───────┘       │    └───────┬──────────┘      │
│                  └───────────────┴────────────┘                  │
│                                  │                               │
│                       base64 MP3 response                        │
└──────────────────────────────────────────────────────────────────┘
                   │
         ┌─────────┼─────────┐
         ▼         ▼         ▼
   ┌──────────┐ ┌──────┐ ┌──────────────┐
   │  Clerk   │ │OpenAI│ │ Fish Audio   │
   │  (Auth)  │ │      │ │ (TTS+Clone)  │
   └──────────┘ └──────┘ └──────────────┘
```

---

## Data Models

### Story
```typescript
interface Story {
  id: string                     // UUID v4
  title: string
  storyText: string              // raw text with emotion tags stripped
  templateId: string             // worldId (e.g. 'forest')
  childName: string              // snapshot at generation time
  createdAt: string              // ISO timestamp
  audioFileName: string          // e.g. "abc123.mp3" (file:// on device)
  status: 'Generating' | 'Ready' | 'Failed'
  isFavorite?: boolean
  rating?: 1 | 2 | 3
}
```

Stories are stored as JSON arrays in AsyncStorage. Audio binaries live in `expo-file-system` under the `Audio/` directory. The two stores are linked by `audioFileName`.

### ChildDetails
```typescript
interface ChildDetails {
  name: string                   // 1-50 chars
  age: number                    // 2-12
  pronouns: 'he/him' | 'she/her' | 'they/them'
  favoriteColor?: string
  favoriteAnimal?: string
  favoriteThing?: string
  voiceId: string                // active voice ID
}
```

Currently singular — no multi-child support.

### VoiceProfile (Custom Cloned Voices)
```typescript
interface VoiceProfile {
  id: string                     // local UUID
  name: string                   // display name (e.g. "Mom's Voice")
  modelId: string                // Fish Audio model ID
  createdAt: string
}
```

### NarrationVoice (Built-in Voices)
```typescript
interface NarrationVoice {
  id: string
  displayName: string
  description: string
  provider: 'fishaudio' | 'elevenlabs'
}
```

Five built-in voices:
- **Aria** (Fish Audio) — default
- **Lily, Ivanna, Jessica, Anvi** (ElevenLabs)

### Subscription
```typescript
interface Subscription {
  status: 'free' | 'active' | 'expired' | 'cancelled'
  plan?: 'monthly' | 'annual'
  provider?: 'apple' | 'google'
  startedAt?: string
  expiresAt?: string
  transactionId?: string
}
```

Not yet wired to a payment processor.

---

## Audio Pipeline — Detailed

### Story Generation → Audio File on Device

```
1. Client calls POST /api/generate-story
   Payload:  { worldId, vibeId, childDetails: { name, age, pronouns } }
   Response: { title, storyText }                          ~3-8s

2. Client calls POST /api/generate-audio
   Payload:  { text: storyText, voiceId, provider, vibeId }
   
   Server:
     a. Hash(processedText + voiceId) → cache lookup
     b. Cache miss: preprocess text, call TTS API          ~5-15s
     c. Run FFmpeg post-processing                         ~2-5s
     d. Store in in-memory cache (200 entry LRU, 2h TTL)
     e. Return base64-encoded MP3
   
   Response size: 200-400 KB base64 (~150-300 KB raw MP3)

3. Client decodes base64 → Uint8Array
4. expo-file-system writeAsStringAsync → Audio/{id}.mp3
5. Story metadata saved to AsyncStorage (status: Ready)
6. Audio URI passed to audioService.loadAndPlay(uri)
```

Total end-to-end time: **20-45 seconds** (dominated by OpenAI + TTS)

### Playback

```
expo-audio createAudioPlayer(uri)
  → Background audio mode (playback continues when app backgrounded)
  → stateListener updates isPlaying, currentTime, duration in store
  → completionListener: was playing + now stopped + at duration → StoryEnd
  → Sleep timer: setInterval, 30s before end → volume fade → stop
```

### Ambient Audio (Planned, Not Yet Functional)

```
World selected → ambientAudioMap[worldId] → expo-audio (loop=true)
Volume: DEFAULT 0.18, user-adjustable 0-1
Sleep timer: fade ambient to 0 before stopping main audio
```

---

## Content Model — Worlds × Vibes Matrix

The story generation prompt is parameterized by world and vibe. Each combination produces a unique emotional arc:

|  | Cozy | Brave | Kind | Wonder | Friends | Inspired |
|--|------|-------|------|--------|---------|---------|
| **Kingdom** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Forest** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Space** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Ocean** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Clouds** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Jungle** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

36 unique combinations × infinite child name/age/pronoun variants = effectively unlimited unique stories.

---

## Infrastructure

### Backend Deployment (Render)

```yaml
# render.yaml
services:
  - type: web
    name: snoozy-backend
    runtime: node
    rootDir: backend
    buildCommand: npm install
    startCommand: node src/index.js
    envVarGroups: [...]
```

- Stateless — no database
- Single instance (no horizontal scaling configured)
- In-memory cache is lost on every deploy/restart
- No persistent logging — all logs go to Render's built-in log stream

### Client Deployment

- **Android:** EAS Build → Google Play (managed workflow)
- **iOS:** EAS Build → App Store (CocoaPods in `ios/` dir for native modules)

### Auth Flow

```
User (Expo) → Clerk frontend SDK → Clerk-issued JWT
JWT stored in SecureStore via tokenCache.ts (Clerk's recommended pattern)

Every API call:
  getToken() from Clerk hook → Bearer: <jwt>
  Server: clerkMiddleware() attaches auth context
  Server: requireAuth() validates token against Clerk's JWKS endpoint
  Server: req.auth().userId confirms identity
```

---

## Scaling Considerations

### Current Limits

| Component | Current Limit | Bottleneck At |
|-----------|--------------|---------------|
| Audio cache | 200 entries in-memory | Lost on restart |
| Story text cache | None | N/A |
| CORS | All origins | Security risk |
| Rate limiting | None | Abuse risk |
| Concurrent requests | Node.js single thread (async) | Very high concurrency |
| FFmpeg | Spawned per request | CPU bound at ~50 rps |

### When to Upgrade What

**~500 stories/day:**
- Replace in-memory audio cache with Redis
- Add per-user rate limiting (express-rate-limit)

**~5,000 stories/day:**
- Add a CDN for audio delivery (store MP3s in S3, serve via CloudFront)
- Move FFmpeg processing to a worker queue (BullMQ + Redis)
- Add structured logging (Datadog / Axiom)

**~50,000 stories/day:**
- Horizontal scaling (Render auto-scaling or migrate to ECS/Fargate)
- Separate audio generation service from story generation service
- Consider pre-generating audio for popular world/vibe/age combinations

### Missing Infrastructure (for Production)

- No rate limiting (cost control, abuse prevention)
- No circuit breaker (if ElevenLabs/Fish Audio is down, all requests fail)
- No retry on transient TTS errors (429, 503)
- No request tracing / correlation IDs
- No metrics (request count, latency p95, TTS API cost per request)
- No alerting (error rate, API quota exhaustion)
- CORS allows all origins — should whitelist app bundle ID

---

## Security Model

### What's Protected

- All `/api/*` routes require valid Clerk JWT
- Zod validation on all POST bodies (type safety, injection prevention)
- Helmet sets security headers (CSP, HSTS, X-Frame-Options)
- `express.json({ limit: '1mb' })` prevents oversized payload attacks
- multer `limits: { fileSize: 20 * 1024 * 1024 }` on voice upload

### What's Not Protected

- No rate limiting per user or IP (TTS APIs are billed per character/second)
- No CORS whitelist — any origin can call the API
- `.env` contains live secrets (should be rotated — see Technical Debt)
- Voice clones created as `visibility: 'public'` on Fish Audio
- No audit log of who generated what

### Authentication Flow Gaps

```javascript
// index.js — double-checks auth that requireAuth() already handles
app.use('/api', requireAuth(), (req, res, next) => {
  if (!req.auth?.()?.userId)   ← redundant check
    return res.status(401)...
})
```

This suggests the original developer wasn't fully confident in Clerk's middleware — the double-check is harmless but indicates uncertainty.

---

## API Contract

### POST /api/generate-story
```
Request:
{
  worldId: 'forest' | 'kingdom' | 'space' | 'ocean' | 'clouds' | 'jungle'
  vibeId:  'cozy' | 'brave' | 'kind' | 'wonder' | 'friends' | 'inspired'
  childDetails: {
    name:     string (1-50 chars)
    age:      number (1-10)
    pronouns: 'he/him' | 'she/her' | 'they/them'
  }
}

Response (200):
{
  success: true,
  title: string,
  storyText: string   (600-750 words, with Fish Audio emotion tags)
}

Response (400): { success: false, error: 'Validation failed', details: [...] }
Response (401): { success: false, error: 'Unauthorized' }
Response (500): { success: false, error: 'Internal server error' }
```

### POST /api/generate-audio
```
Request:
{
  text:     string (1-10000 chars)
  voiceId:  string (optional — falls back to default per provider)
  provider: 'elevenlabs' | 'fishaudio'
  vibeId:   'cozy' | 'brave' | ... (optional — affects SSML timing)
}

Response (200):
{
  success: true,
  audio: string   (base64-encoded MP3)
}
```

### POST /api/create-voice-clone
```
Request: multipart/form-data
  audio: File  (wav/mp3/flac/webm, max 20 MB)
  name:  string

Response (200):
{
  success: true,
  voiceModelId: string,
  state: 'trained' | string
}
```

### DELETE /api/voice-clone/:id
```
Response (200): { success: true }
```
