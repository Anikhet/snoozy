import { Platform, StyleSheet } from 'react-native'

export const Colors = {
  light: {
    background: '#FBF5EC',
    backgroundDeep: '#F4EBD9',
    surface: '#FFFFFF',
    ink: '#2B2130',
    inkSoft: '#6E5F69',
    inkMute: '#9A8A92',
    hair: 'rgba(43,33,48,0.08)',
    primary: '#5B5BD6',
    primarySoft: '#E6E5FF',
    primaryInk: '#3A3AA8',
    accent: '#E9A97A',
    gold: '#C9A56B',
    error: '#D96C6C',
    night: '#0F1530',
    nightDeep: '#070B1E',
    nightSurface: '#1A2144',
    nightInk: '#F2EDE3',
    nightInkSoft: 'rgba(242,237,227,0.62)',
    nightHair: 'rgba(242,237,227,0.14)',
  },
  dark: {
    background: '#0F1530',
    backgroundDeep: '#070B1E',
    surface: '#1A2144',
    ink: '#F2EDE3',
    inkSoft: 'rgba(242,237,227,0.62)',
    inkMute: 'rgba(242,237,227,0.4)',
    hair: 'rgba(242,237,227,0.14)',
    primary: '#9BA0FF',
    primarySoft: '#2A2F5E',
    primaryInk: '#CBCDFF',
    accent: '#E9A97A',
    gold: '#D8B87A',
    error: '#FF8A8A',
    night: '#0F1530',
    nightDeep: '#070B1E',
    nightSurface: '#1A2144',
    nightInk: '#F2EDE3',
    nightInkSoft: 'rgba(242,237,227,0.62)',
    nightHair: 'rgba(242,237,227,0.14)',
  },
} as const

export type ThemeColors = {
  [K in keyof typeof Colors.light]: string
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const Radii = {
  small: 12,
  field: 14,
  button: 18,
  card: 20,
  cardLarge: 28,
} as const

export const Sizing = {
  buttonHeight: 56,
  cardMinHeight: 140,
} as const

const SERIF = 'PlayfairDisplay_400Regular'
const SERIF_MEDIUM = 'PlayfairDisplay_500Medium'
const SERIF_ITALIC = 'PlayfairDisplay_400Regular_Italic'
const SERIF_MEDIUM_ITALIC = 'PlayfairDisplay_500Medium_Italic'
const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace'

export const Fonts = StyleSheet.create({
  serifDisplay: { fontSize: 38, lineHeight: 44, fontFamily: SERIF, letterSpacing: -0.8 },
  serifDisplayItalic: { fontSize: 38, lineHeight: 44, fontFamily: SERIF_ITALIC, letterSpacing: -0.8 },
  serifTitle: { fontSize: 30, lineHeight: 36, fontFamily: SERIF_MEDIUM, letterSpacing: -0.4 },
  serifTitleItalic: { fontSize: 30, lineHeight: 36, fontFamily: SERIF_MEDIUM_ITALIC, letterSpacing: -0.4 },
  serifHeadline: { fontSize: 22, lineHeight: 28, fontFamily: SERIF_MEDIUM },
  serifHeadlineItalic: { fontSize: 22, lineHeight: 28, fontFamily: SERIF_MEDIUM_ITALIC },
  serifBody: { fontSize: 17, lineHeight: 24, fontFamily: SERIF_MEDIUM, letterSpacing: -0.2 },
  serifBodyItalic: { fontSize: 17, lineHeight: 24, fontFamily: SERIF_MEDIUM_ITALIC, letterSpacing: -0.2 },
  serifBodyRegular: { fontSize: 17, lineHeight: 24, fontFamily: SERIF, letterSpacing: -0.2 },
  serifBodyRegularItalic: { fontSize: 17, lineHeight: 24, fontFamily: SERIF_ITALIC, letterSpacing: -0.2 },
  title3: { fontSize: 20, lineHeight: 26, fontFamily: SERIF_MEDIUM },
  title3Italic: { fontSize: 20, lineHeight: 26, fontFamily: SERIF_MEDIUM_ITALIC },
  body: { fontSize: 16, lineHeight: 23, fontFamily: 'Nunito_400Regular' },
  bodySemiBold: { fontSize: 16, lineHeight: 23, fontFamily: 'Nunito_600SemiBold' },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: 'Nunito_500Medium' },
  captionSemiBold: { fontSize: 13, lineHeight: 18, fontFamily: 'Nunito_600SemiBold' },
  caption2: { fontSize: 12, lineHeight: 16, fontFamily: 'Nunito_400Regular' },
  caption2Bold: { fontSize: 12, lineHeight: 16, fontFamily: 'Nunito_700Bold' },
  buttonLabel: { fontSize: 16, lineHeight: 22, fontFamily: 'Nunito_700Bold' },
  eyebrow: { fontSize: 11, lineHeight: 14, fontFamily: 'Nunito_700Bold', letterSpacing: 2, textTransform: 'uppercase' as const },
  mono: { fontSize: 11, lineHeight: 14, fontFamily: MONO, fontWeight: '500' as const },
})

/**
 * Returns the lift shadow style for elevated components (buttons, cards).
 * Uses ink color in light mode, softer in dark.
 */
export function getLiftShadow(isDark: boolean) {
  return {
    shadowColor: isDark ? '#000000' : '#2B2130',
    shadowOpacity: isDark ? 0.32 : 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  } as const
}

/**
 * Returns the card shadow style for surface cards.
 */
export function getCardShadow(isDark: boolean) {
  return {
    shadowColor: isDark ? '#000000' : '#2B2130',
    shadowOpacity: isDark ? 0.12 : 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  } as const
}
