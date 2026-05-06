# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start Expo dev server (Metro bundler)
cd snoozy-android && npx expo start

# Run on Android device/emulator
cd snoozy-android && npx expo run:android

# Run on iOS simulator
cd snoozy-android && npx expo run:ios

# TypeScript type-check (no emitter)
cd snoozy-android && npx tsc --noEmit
```

There is no lint script or test suite configured.

## Architecture

### Navigation model
There is **no React Navigation**. Navigation is a single Zustand field `currentScreen: Screen` (enum in `src/types/navigation.ts`). `App.tsx` renders each screen as a conditional `Animated.View` keyed on `currentScreen`, with slide/fade transitions driven by a second field `navDir: 'forward' | 'back'`. All navigate calls go through `storyStore` actions (`navigateToWorldPicker`, `goHome`, etc.).

### State: Zustand store (`src/stores/storyStore.ts`)
One global store owns all app state: current screen, child details, saved stories, audio playback, and the "editing profile" overlay flag. The store also runs the story generation pipeline (`runGeneration`) as a background async function that updates story status in-place. Cancellation uses `AbortController` instances keyed by story ID in a module-level `Map`.

### Story generation flow
`HomeScreen` → `WorldPickerScreen` → `VibePickerScreen` → `GeneratingScreen` (background: API → audio → save) → `StoryPlayerScreen` / `StoryEndScreen`

### Auth: Clerk
`ClerkProvider` wraps everything. `SignedOut` renders `AuthScreen`; `SignedIn` renders the app. After sign-in, `ChildProfileScreen` runs once (keyed by `CHILD_PROFILE_KEY` in AsyncStorage) to collect name/age/pronouns/voice. Clerk JWT tokens are retrieved with `useAuth().getToken()` and passed to the backend on every API call.

### Backend API (`src/services/apiService.ts` → backend)
Two endpoints under `/api`:
- `POST /api/story` — generates story text (Claude via OpenAI-compat SDK)
- `POST /api/audio` — generates TTS audio (ElevenLabs / OpenAI), returns base64

All backend routes are JWT-protected via `requireAuth()` (Clerk Express middleware).

### Local storage
`src/services/storageService.ts` — stories persisted to `expo-file-system` as JSON + audio files. Audio filenames stored in the `Story` object.

### Design tokens (`src/config/tokens.ts`)
- `Colors.light` / `Colors.dark` — full palette. Dark mode is **force-disabled** in `App.tsx` (`isDark = false`).
- `Spacing` — xs(4) sm(8) md(16) lg(24) xl(32) xxl(48)
- `Radii` — field(14) small(12) button(18) card(20) cardLarge(28)
- `Fonts` — pre-built `StyleSheet` objects. Prefer `Fonts.*` over raw `fontFamily` strings.

### Path alias
`@/` maps to `src/` (configured in `tsconfig.json`).

## Constraints

### Shadows: DO NOT USE
Never add `shadowColor`, `shadowOpacity`, `shadowRadius`, `shadowOffset`, `elevation`, or text shadow props to any component. Shadows were removed app-wide because they render incorrectly on Android. Use `borderWidth` + `borderColor` for visual depth instead.

### Fonts: Nunito only
Never use Fraunces — it has been removed. Only these families are loaded:
- `Nunito_400Regular`, `Nunito_500Medium`, `Nunito_600SemiBold`, `Nunito_700Bold`

### Spacing consistency
Always use `Spacing.*` tokens for padding/margin/gap. Never mix a token and a raw number on the same component (e.g. don't use `paddingHorizontal: Spacing.md` alongside `paddingVertical: 12`).

### Back navigation
`BackSwipeZone` (left-edge swipe) + `useBackHandler` (Android hardware back) cover all back gestures. Do not add visible back-button UI to screens that already have both of these wired up.
