import { StyleSheet } from 'react-native'

/**
 * Snoozy premium palette — editorial, warm, storybook-leaning.
 * Serif (Fraunces) for emotional beats; rounded sans (Nunito) for UI.
 */
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
    primaryInk: '#493cd4ff',
    accent: '#E9A97A',
    gold: '#C9A56B',
    error: '#D96C6C',

    // Card gradients — light stop + deep stop
    cardLavender: '#E8E5FF',
    cardLavenderDeep: '#B8ABE8',
    cardPeach: '#FBE1CC',
    cardPeachDeep: '#F4C7A0',
    cardMint: '#D7ECDD',
    cardMintDeep: '#B6D6BF',
    cardOcean: '#D4E4F0',
    cardOceanDeep: '#B9D0E5',
    cardCosmos: '#DCD5F1',
    cardCosmosDeep: '#B8ABE8',
    cardRose: '#F6DCE1',
    cardRoseDeep: '#E9B5C1',
    cardSnow: '#E4ECEE',
    cardSnowDeep: '#B8C8CC',
    cardRain: '#D4DEE8',
    cardRainDeep: '#A8BBCE',

    starGold: '#F5C842',
    worldCardBg: '#F0EBFF',
    vibeSelected: '#7B5EA7',
    vibeSelectedText: '#FFFFFF',

    // Legacy aliases so existing code still resolves while migrating
    textPrimary: '#2B2130',
    textSecondary: '#6E5F69',
    secondary: '#E9A97A',
    tertiary: '#D7ECDD',
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
    primaryInk: '#9699e5ff',
    accent: '#E9A97A',
    gold: '#D8B87A',
    error: '#FF8A8A',

    cardLavender: '#2E2B4A',
    cardLavenderDeep: '#3F3A5C',
    cardPeach: '#3A2E28',
    cardPeachDeep: '#4E3D32',
    cardMint: '#1E3A30',
    cardMintDeep: '#2C4A3E',
    cardOcean: '#1E2E3A',
    cardOceanDeep: '#2E3E4A',
    cardCosmos: '#2A254A',
    cardCosmosDeep: '#3B3458',
    cardRose: '#3A1E2E',
    cardRoseDeep: '#4C2E3C',
    cardSnow: '#1E2E34',
    cardSnowDeep: '#30404A',
    cardRain: '#202838',
    cardRainDeep: '#30394A',

    starGold: '#F5C842',
    worldCardBg: '#2A2545',
    vibeSelected: '#7B5EA7',
    vibeSelectedText: '#FFFFFF',

    textPrimary: '#F2EDE3',
    textSecondary: 'rgba(242,237,227,0.62)',
    secondary: '#E9A97A',
    tertiary: '#1E3A30',
  },
} as const

/** Night-mode dedicated tones, independent of theme toggle. Used by the
 *  "dreaming" player which is always dark regardless of app scheme. */
export const Night = {
  bg: '#0F1530',
  bgDeep: '#070B1E',
  surface: '#1A2144',
  ink: '#F2EDE3',
  inkSoft: 'rgba(242,237,227,0.62)',
  inkMute: 'rgba(242,237,227,0.4)',
  hair: 'rgba(242,237,227,0.14)',
  glass: 'rgba(242,237,227,0.06)',
} as const

export type ThemeColors = (typeof Colors)['light'] | (typeof Colors)['dark']

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const Radii = {
  field: 14,
  small: 12,
  button: 18,
  card: 20,
  cardLarge: 28,
} as const

export const Sizing = {
  buttonHeight: 56,
  cardMinHeight: 140,
} as const

/**
 * Typography — Fraunces (serif) for editorial beats, Nunito (rounded sans) for UI,
 * system monospace for timers/metadata.
 */
export const Fonts = StyleSheet.create({
  // Serif — emotional beats
  serifDisplay: { fontSize: 38, fontFamily: 'Fraunces_400Regular', letterSpacing: -0.8 },
  serifTitle: { fontSize: 30, fontFamily: 'Fraunces_400Regular', letterSpacing: -0.6 },
  serifHeadline: { fontSize: 22, fontFamily: 'Fraunces_500Medium', letterSpacing: -0.2 },
  serifBody: { fontSize: 17, fontFamily: 'Fraunces_400Regular' },
  serifItalic: { fontSize: 20, fontFamily: 'Fraunces_500Medium_Italic' },

  // Sans (rounded) — UI
  body: { fontSize: 15, fontFamily: 'Nunito_400Regular' },
  bodyBold: { fontSize: 15, fontFamily: 'Nunito_700Bold' },
  buttonLabel: { fontSize: 16, fontFamily: 'Nunito_700Bold' },
  caption: { fontSize: 12, fontFamily: 'Nunito_600SemiBold' },
  eyebrow: { fontSize: 11, fontFamily: 'Nunito_700Bold', letterSpacing: 2 },

  // Mono — timers & metadata
  mono: { fontSize: 11, fontFamily: 'monospace', letterSpacing: 0.4 },

  // Legacy aliases — keep until all callers migrate
  largeTitle: { fontSize: 34, fontFamily: 'Nunito_700Bold' },
  title: { fontSize: 22, fontFamily: 'Nunito_600SemiBold' },
  title3: { fontSize: 20, fontFamily: 'Nunito_500Medium' },
  headline: { fontSize: 17, fontFamily: 'Nunito_500Medium' },
  caption2: { fontSize: 11, fontFamily: 'Nunito_400Regular' },
})

/**
 * Soft lifted-card shadow — deeper in light mode, gentler glow in dark.
 */
export function getCardShadow(isDark: boolean) {
  return {
    shadowColor: isDark ? '#FFFFFF' : '#000000',
    shadowOpacity: isDark ? 0.04 : 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  } as const
}

/**
 * Heavier shadow for primary CTAs and floating elements.
 */
export function getLiftShadow(isDark: boolean) {
  return {
    shadowColor: isDark ? '#000000' : '#2B2130',
    shadowOpacity: isDark ? 0.4 : 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  } as const
}
