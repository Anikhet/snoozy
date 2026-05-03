# Snoozy Android — Claude Code Guidelines

## Shadows: DO NOT USE

**Never add shadows to any component.** This includes:

- `shadowColor`, `shadowOpacity`, `shadowRadius`, `shadowOffset` — iOS shadow props
- `elevation` — Android shadow prop
- `textShadowColor`, `textShadowOffset`, `textShadowRadius` — text shadow props
- `getCardShadow()` — deleted, do not recreate
- `getLiftShadow()` — deleted, do not recreate

Shadows were removed across the entire app because they appear incorrectly on Android and the design does not use them. Do not re-add them for any reason, even on iOS-only components or CTAs.

If visual depth is needed, use `borderWidth` + `borderColor` or adjust `backgroundColor`.

## Fonts: Nunito only

**Never use Fraunces.** It has been removed from the project entirely — the imports are gone from `App.tsx` and it is no longer loaded.

The only font families available are:
- `Nunito_400Regular`
- `Nunito_500Medium`
- `Nunito_600SemiBold`
- `Nunito_700Bold`

Use the `Fonts.*` tokens from `@/config/tokens` wherever possible (`Fonts.serifTitle`, `Fonts.body`, etc.). Only use raw `fontFamily` strings for sizes that don't have a token.
