# Snoozy — Product Analysis

## The Core Proposition

> A child hearing their own mom or dad reading a personalized story when the parent isn't physically present? That's not a TTS feature — that's the entire product proposition.

Snoozy generates a unique, personalized bedtime story narrated in a parent's cloned voice. Every story is tailored to the child's name, age, pronouns, a chosen world (forest, space, ocean, etc.), and an emotional vibe (cozy, brave, kind, etc.). The output is a ~5-minute audio story the child can replay at bedtime — regardless of where the parent is.

---

## Target User

**Primary:** Parents of children aged 3–10 who:
- Travel frequently for work
- Have inconsistent bedtime schedules
- Want a consistent bedtime ritual that doesn't require presence
- Value personalization over generic content (vs. Spotify Kids, Calm)

**Secondary:** Parents who are physically present but want a calm, screen-free wind-down routine they can set and forget.

---

## Core User Flows

### Flow 1 — First-Run Onboarding

```
Install → Sign Up (Clerk) → Child Profile (name, age, pronouns)
→ [Optional: record voice clone] → Home
```

**Current state:** Onboarding sets name/age/pronouns only. Voice clone setup is accessible from Profile, not from onboarding. This is a missed moment — voice cloning is the killer feature and should be surfaced on day 1.

---

### Flow 2 — Story Creation (Primary Flow)

```
Home → "Create a Story" CTA
→ WorldPickerScreen  (pick 1 of 6 worlds, ambient preview plays)
→ VibePickerScreen   (pick 1 of 6 moods)
→ GeneratingScreen   (20-45s, animated progress bar)
→ StoryPlayerScreen  (auto-play, full audio player)
→ StoryEndScreen     (rate, replay, new story, library)
```

**Strengths:**
- Flow is linear and simple — a child could navigate it
- World selection plays ambient audio preview immediately — creates desire
- Progress screen with personalized copy keeps user engaged during the wait
- Stories auto-start on the player — no extra tap needed

**Weaknesses:**
- No recap/confirmation before generation ("You're making a cozy forest story for Aarav, 5") — users sometimes misfire
- No story length option (always ~700 words / ~5 min)
- No custom prompt or "add a character" field
- Cancel during generation leaves a "Failed" placeholder in the library — no auto-cleanup

---

### Flow 3 — Listening

```
Player: Cover art → waveform scrubber → ±15s seek → sleep timer → ambient mixer
```

**Strengths:**
- Sleep timer with 30s fade-out is exactly right
- Ambient mixer lets the parent tune background sound level (when it works)
- "Read along" toggle shows full story text — great for kids learning to read

**Weaknesses:**
- Ambient audio is non-functional (all files are null — see Technical Debt)
- Favorite button in the player doesn't save to storage — visual state only
- "More options" button is an empty handler
- Waveform scrubber is decorative (not driven by real audio amplitude data)

---

### Flow 4 — Library & Re-listening

```
Library → 2-column grid → tap → Player (resumes or restarts)
```

**Strengths:** Clean grid layout, search, favorites filter, sort by date/A-Z.

**Weaknesses:**
- No pagination — will degrade with 50+ stories
- No story sharing (can't send a story to the other parent or grandparent)
- No "auto-delete old stories" to manage device storage
- Failed generation placeholder stories sit in the library with no recovery action

---

### Flow 5 — Voice Cloning

```
Profile → Narrator Voice → "Add Your Voice" → VoiceSetupScreen
→ Record audio sample → Upload → Fish Audio trains model
→ Voice appears in the voice grid → select as narrator
```

**Strengths:** The technical infrastructure is complete and working. Fish Audio S2 Pro produces high-quality clones.

**Weaknesses:**
- No guidance on what to record ("read this paragraph aloud for best results")
- No quality feedback on the uploaded sample before submission
- Training is async — no "voice is ready" push notification when training completes
- Voice setup is buried in Profile settings, not surfaced in onboarding

---

## What's Working Well

### 1. Prompt Engineering Is Exceptional
The story generation prompt (`templates.js`) is production-quality craft. It encodes:
- 5-section story structure with word-count targets per section
- Age-gated vocabulary in 4 tiers
- TTS-aware writing (avoid heteronyms, prefer soft phonemes)
- Mandatory "signature moment" — one original magical detail per story
- Fish Audio emotion tag discipline (approved list, banned list, placement strategy)

This is the product's deepest moat. Getting AI to write consistently beautiful, child-safe, audio-optimized stories at this level of craft is genuinely hard.

### 2. Audio Pipeline Is Mature
- Two TTS providers with per-vibe voice tuning
- SSML breaks timed to vibe (cozy = 900ms gaps, brave = 600ms)
- Pronunciation dictionary for South Asian names (a genuine inclusivity win)
- EBU R128 loudness normalization ensures consistent volume
- Bedtime EQ on Fish Audio (lowpass 12kHz, tempo-warped tail)
- In-memory cache prevents re-generating identical audio

### 3. Clean Linear UX
The world → vibe → generate → play → rate flow is simple and pleasant. The visual language (Nunito, cream backgrounds, lavender primary) is appropriate for the product.

### 4. Sleep Timer
The 30-second fade-out before the timer ends is a thoughtful, sleep-science-informed detail. This is exactly the kind of thing parents notice and remember.

---

## Major Shortcomings

### P0 — Ambient Audio Non-Functional
The ambient audio system (world-specific background soundscapes) is the #2 differentiator after voice cloning. The UI shows a volume mixer and the infrastructure is complete. But **all ambient audio files are null**. The generate-ambient.js script exists but was never run, or the output was never committed to assets.

Users can interact with the ambient volume slider and nothing happens. This is actively misleading.

**Fix:** Run `generate-ambient.js` for all 6 worlds and commit the audio files.

---

### P0 — Favorite Button Broken in Player
The favorite button in `StoryPlayerScreen` toggles local state (`isFavorited`) but never calls `storyStore.toggleFavorite()`. Tapping it shows a heart fill animation but the story is not marked as favorite in storage. On reload, the state resets.

**Fix:** Wire the button to the store action.

---

### P1 — Voice Cloning Not Surfaced on Day 1
The product's core differentiator (parent's voice) is hidden in Profile > Narrator Voice. A first-time user who doesn't explore settings will never know it exists and will get the default robot-sounding voice.

**Fix:** Add voice clone setup as an optional step in onboarding, positioned as "make it sound like you."

---

### P1 — No Story Customization
Every story uses the same structure and length. There's no way to:
- Add a custom element ("include our dog Max")
- Choose story length (short = 3 min, full = 7 min)
- Request a sequel to yesterday's story
- Set a recurring character (the child's stuffed animal, a pet)

These are the most-requested features in comparable apps. The prompt infrastructure is in place — this is primarily a UI/API surface problem.

---

### P1 — Subscription Flow Is a Stub
The subscription types are defined (`SubscriptionStatus`, `Subscription`), basic state management exists, and there's a `SnoozyPlusScreen` — but there is no actual payment integration. No RevenueCat, no App Store in-app purchase, no StoreKit 2, no receipt validation. The app has no revenue mechanism today.

---

### P2 — No Push Notification for Voice Clone Completion
Fish Audio trains voice clones asynchronously. After uploading, the user returns to the app and has no idea if training is done. There's no polling, no webhook, no push notification. The user must manually check.

---

### P2 — No Story Sharing
There's no way to share a generated story with another parent, a grandparent, or save it as an audio file. For a product about connection, this is a notable gap.

---

### P2 — Library Degrades at Scale
The library is a flat list with no pagination. At 50+ stories it will become slow and unwieldy. There's no automatic archive or expiry.

---

### P3 — Insights Are Thin
InsightsScreen shows stories created count, a 7-day bar chart, and a streak. But there's no:
- Most listened-to story
- Favorite world / vibe
- Average listening duration
- Milestone celebrations ("You've created 10 stories!")

These are motivational features that drive retention.

---

### P3 — No Offline Support
The app requires network for story generation (expected) but also for re-playing already-downloaded stories if something in the playback path makes a network call. Audio files are stored locally — the playback experience should be fully offline.

---

## Competitive Positioning

| App | Personalization | Parent Voice | Ambient | Story Library |
|-----|----------------|-------------|---------|---------------|
| **Snoozy** | High (name/age/world/vibe) | Yes (cloning) | Partial | Local |
| Calm Kids | None | No | Yes | Curated |
| Moshi | Low (name only) | No | Yes | Curated |
| Bedtime FM | None | No | No | Curated |
| Story.com | Medium | No | No | Generated |

Snoozy's differentiation is real and meaningful. The combination of deep personalization + parent voice + AI generation is unique. The execution just needs the gaps above closed.

---

## Product Opportunities (Near-Term)

1. **"Read to me in Daddy's voice"** — Make voice cloning the hero of the onboarding sequence, not a buried setting.
2. **Story sequels** — "Continue last night's story" button on the home screen. The prompt is already world/vibe-aware — just carry forward the child's name and last world/vibe.
3. **Custom story elements** — A single optional text field: "Add something special" (pet, friend, toy). Low engineering cost, very high perceived personalization value.
4. **Share a story** — "Send this story to grandma" → generates a shareable link or audio file export. Viral growth mechanic.
5. **Bedtime routine mode** — Auto-plays story at scheduled bedtime (notification → tap → auto-play). The notification infrastructure already exists.
6. **Multi-child support** — The data model (`ChildDetails`) is singular. Adding support for multiple children profiles is the most requested feature for families with 2+ kids.
