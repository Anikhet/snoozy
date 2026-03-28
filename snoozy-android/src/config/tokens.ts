import { StyleSheet } from 'react-native'

export const Colors = {
  light: {
    background: '#FFF8F0',
    surface: '#FFFFFF',
    primary: '#7C83FD',
    secondary: '#FFCBA4',
    tertiary: '#A8E6CF',
    textPrimary: '#3D2C2E',
    textSecondary: '#7A6B6E',
    error: '#FF6B6B',
    cardLavender: '#E8E5FF',
    cardPeach: '#FFE8D6',
    cardMint: '#D4F0E7',
    cardOcean: '#D6ECFF',
    cardCosmos: '#E5DFFF',
    cardRose: '#FFE0EC',
    cardSnow: '#E8F4F8',
    cardRain: '#DAE8F0',
  },
  dark: {
    background: '#1A1A2E',
    surface: '#252540',
    primary: '#9BA0FF',
    secondary: '#FFD4A8',
    tertiary: '#B8F0D5',
    textPrimary: '#F0EBE3',
    textSecondary: '#A09898',
    error: '#FF8A8A',
    cardLavender: '#2E2B4A',
    cardPeach: '#3A2E28',
    cardMint: '#1E3A30',
    cardOcean: '#1E2E3A',
    cardCosmos: '#2A254A',
    cardRose: '#3A1E2E',
    cardSnow: '#1E2E34',
    cardRain: '#202838',
  },
} as const

export type ThemeColors = {
  background: string
  surface: string
  primary: string
  secondary: string
  tertiary: string
  textPrimary: string
  textSecondary: string
  error: string
  cardLavender: string
  cardPeach: string
  cardMint: string
  cardOcean: string
  cardCosmos: string
  cardRose: string
  cardSnow: string
  cardRain: string
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
  card: 20,
  button: 16,
  small: 12,
} as const

export const Sizing = {
  buttonHeight: 56,
  cardMinHeight: 140,
} as const

export const Fonts = StyleSheet.create({
  largeTitle: { fontSize: 34, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '600' },
  title3: { fontSize: 20, fontWeight: '500' },
  headline: { fontSize: 17, fontWeight: '500' },
  body: { fontSize: 17, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
  caption2: { fontSize: 11, fontWeight: '400' },
  buttonLabel: { fontSize: 20, fontWeight: '600' },
})

/**
 * Returns the shadow style object for the Snoozy card shadow.
 * Light mode: black 6% opacity, dark mode: white 4% opacity.
 */
export function getCardShadow(isDark: boolean) {
  return {
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOpacity: isDark ? 0.04 : 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  } as const
}
