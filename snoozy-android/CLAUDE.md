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
