/**
 * StoryCoverTile — Procedural story cover tiles for Snoozy.
 * Each world has a unique gradient palette and SVG decorative motif.
 * Used in: HomeScreen (ContinueListening), LibraryScreen, StoryPlayerScreen, StoryEndScreen.
 *
 * @example
 * // Small thumbnail — ContinueListening card
 * <StoryCoverTile title="The Star Who Forgot to Twinkle" worldId="space" size="sm" />
 *
 * // Library grid card — parent controls width via container
 * <StoryCoverTile title="Emma and the Dragon of Kindness" worldId="kingdom" size="md" />
 *
 * // Player screen hero — full width, tall
 * <StoryCoverTile title="The Little Fox Who Chased the Stars" worldId="forest" size="hero" />
 */
import React, { memo } from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Ellipse, G, Line, Path, Polygon } from 'react-native-svg'
import { Radii } from '@/config/tokens'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface StoryCoverTileProps {
  title: string
  worldId: string
  size: 'sm' | 'md' | 'lg' | 'hero'
  borderRadius?: number
  style?: ViewStyle
}

type SizeConfig = {
  titleSize: number
  emojiSize: number
  lines: number
  containerStyle: ViewStyle
  showBadge: boolean
  titlePaddingH: number
}

type MotifKey = 'kingdom' | 'forest' | 'space' | 'ocean' | 'clouds' | 'jungle'

type WorldTheme = {
  emoji: string
  name: string
  gradient: readonly [string, string, string]
  gradientStart: { x: number; y: number }
  gradientEnd: { x: number; y: number }
  titleColor: string
  ghostRotation: string
  motif: MotifKey
}

// ─── Size map ──────────────────────────────────────────────────────────────────

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'hero', SizeConfig> = {
  sm: {
    titleSize: 9,
    emojiSize: 28,
    lines: 2,
    containerStyle: { width: 72, height: 72 },
    showBadge: false,
    titlePaddingH: 6,
  },
  md: {
    titleSize: 16,
    emojiSize: 52,
    lines: 3,
    containerStyle: { width: '100%', aspectRatio: 1 },
    showBadge: true,
    titlePaddingH: 14,
  },
  lg: {
    titleSize: 20,
    emojiSize: 64,
    lines: 3,
    containerStyle: { width: '100%', aspectRatio: 1 },
    showBadge: true,
    titlePaddingH: 16,
  },
  hero: {
    titleSize: 24,
    emojiSize: 80,
    lines: 4,
    containerStyle: { width: '100%', height: 320 },
    showBadge: true,
    titlePaddingH: 24,
  },
}

// ─── World themes ──────────────────────────────────────────────────────────────

const WORLD_THEMES: Record<string, WorldTheme> = {
  kingdom: {
    emoji: '🏰',
    name: 'Magical Kingdom',
    gradient: ['#3D1A78', '#6B3FA0', '#C4A0FF'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    titleColor: '#FFFFFF',
    ghostRotation: '-12deg',
    motif: 'kingdom',
  },
  forest: {
    emoji: '🌲',
    name: 'Enchanted Forest',
    gradient: ['#0D3B2A', '#1B6B42', '#4CAF7D'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 0.8, y: 1 },
    titleColor: '#E8FFE8',
    ghostRotation: '8deg',
    motif: 'forest',
  },
  space: {
    emoji: '🚀',
    name: 'Outer Space',
    gradient: ['#070318', '#1A0F4E', '#4B3B9E'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    titleColor: '#E8E0FF',
    ghostRotation: '-6deg',
    motif: 'space',
  },
  ocean: {
    emoji: '🐠',
    name: 'Ocean Deep',
    gradient: ['#062F40', '#0E6B8A', '#2BB5D8'],
    gradientStart: { x: 0, y: 1 },
    gradientEnd: { x: 1, y: 0 },
    titleColor: '#E0F8FF',
    ghostRotation: '15deg',
    motif: 'ocean',
  },
  clouds: {
    emoji: '☁️',
    name: 'Cloud Kingdom',
    gradient: ['#5B70C4', '#8B9EE8', '#C5D0F5'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    titleColor: '#FFFFFF',
    ghostRotation: '-10deg',
    motif: 'clouds',
  },
  jungle: {
    emoji: '🦁',
    name: 'Magical Safari',
    gradient: ['#3D2000', '#8B5E00', '#E8A020'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 1, y: 1 },
    titleColor: '#FFF8E0',
    ghostRotation: '12deg',
    motif: 'jungle',
  },
}

// ─── Helper ────────────────────────────────────────────────────────────────────

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = []
  for (let i = 0; i < 4; i++) {
    const outerAngle = (Math.PI * i) / 2 - Math.PI / 2
    pts.push(
      `${(cx + outer * Math.cos(outerAngle)).toFixed(1)},${(cy + outer * Math.sin(outerAngle)).toFixed(1)}`,
    )
    const innerAngle = outerAngle + Math.PI / 4
    pts.push(
      `${(cx + inner * Math.cos(innerAngle)).toFixed(1)},${(cy + inner * Math.sin(innerAngle)).toFixed(1)}`,
    )
  }
  return pts.join(' ')
}

// ─── SVG Motif components ──────────────────────────────────────────────────────

const KingdomMotif = memo(function KingdomMotif() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Polygon points={starPoints(15, 15, 4, 1.5)} fill="white" opacity="0.16" />
      <Polygon points={starPoints(82, 12, 3, 1.2)} fill="white" opacity="0.13" />
      <Polygon points={starPoints(90, 55, 5, 2)} fill="white" opacity="0.18" />
      <Polygon points={starPoints(8, 62, 3.5, 1.4)} fill="white" opacity="0.13" />
      <Polygon points={starPoints(50, 85, 4, 1.5)} fill="white" opacity="0.14" />
      <Polygon points={starPoints(32, 42, 3, 1.2)} fill="white" opacity="0.12" />
      <Line x1="62" y1="5" x2="98" y2="35" stroke="white" strokeWidth="0.5" opacity="0.08" />
      <Line x1="74" y1="2" x2="100" y2="20" stroke="white" strokeWidth="0.5" opacity="0.07" />
      <Polygon points="50,4 54.5,9.5 50,15 45.5,9.5" fill="white" opacity="0.15" />
    </Svg>
  )
})

const ForestMotif = memo(function ForestMotif() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Ellipse cx="15" cy="25" rx="7" ry="3" transform="rotate(30 15 25)" fill="white" opacity="0.10" />
      <Ellipse cx="78" cy="18" rx="8" ry="3.5" transform="rotate(-20 78 18)" fill="white" opacity="0.10" />
      <Ellipse cx="35" cy="55" rx="6" ry="2.5" transform="rotate(50 35 55)" fill="white" opacity="0.09" />
      <Ellipse cx="70" cy="48" rx="7" ry="3" transform="rotate(-40 70 48)" fill="white" opacity="0.10" />
      <Ellipse cx="10" cy="72" rx="6" ry="2.5" transform="rotate(15 10 72)" fill="white" opacity="0.09" />
      <Ellipse cx="85" cy="68" rx="7" ry="3" transform="rotate(-25 85 68)" fill="white" opacity="0.10" />
      <Ellipse cx="50" cy="82" rx="8" ry="3" transform="rotate(35 50 82)" fill="white" opacity="0.09" />
      <Ellipse cx="25" cy="40" rx="6" ry="2.5" transform="rotate(-15 25 40)" fill="white" opacity="0.10" />
      <Circle cx="45" cy="30" r="1.5" fill="white" opacity="0.18" />
      <Circle cx="62" cy="42" r="1.5" fill="white" opacity="0.18" />
      <Circle cx="20" cy="58" r="1.5" fill="white" opacity="0.16" />
      <Circle cx="73" cy="75" r="1.5" fill="white" opacity="0.18" />
      <Circle cx="38" cy="68" r="1.5" fill="white" opacity="0.16" />
      <Circle cx="85" cy="35" r="1.5" fill="white" opacity="0.18" />
      <Path d="M0 88 Q25 82 50 88 Q75 94 100 88" stroke="white" strokeWidth="0.8" fill="none" opacity="0.08" />
      <Path d="M0 92 Q30 86 55 92 Q80 98 100 92" stroke="white" strokeWidth="0.8" fill="none" opacity="0.07" />
      <Path d="M0 96 Q35 90 60 96 Q85 100 100 96" stroke="white" strokeWidth="0.8" fill="none" opacity="0.06" />
    </Svg>
  )
})

const SpaceMotif = memo(function SpaceMotif() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Circle cx="12" cy="8" r="2.5" fill="white" opacity="0.22" />
      <Circle cx="90" cy="5" r="2" fill="white" opacity="0.20" />
      <Circle cx="45" cy="18" r="1.5" fill="white" opacity="0.18" />
      <Circle cx="76" cy="32" r="2.5" fill="white" opacity="0.22" />
      <Circle cx="20" cy="45" r="1.5" fill="white" opacity="0.16" />
      <Circle cx="88" cy="62" r="2" fill="white" opacity="0.20" />
      <Circle cx="35" cy="76" r="2.5" fill="white" opacity="0.22" />
      <Circle cx="65" cy="84" r="2" fill="white" opacity="0.18" />
      <Circle cx="30" cy="14" r="1.5" fill="white" opacity="0.18" />
      <Circle cx="55" cy="10" r="1.5" fill="white" opacity="0.15" />
      <Circle cx="8" cy="30" r="1" fill="white" opacity="0.16" />
      <Circle cx="93" cy="40" r="1.5" fill="white" opacity="0.18" />
      <Circle cx="50" cy="55" r="1" fill="white" opacity="0.14" />
      <Circle cx="10" cy="65" r="1.5" fill="white" opacity="0.16" />
      <Path d="M58 22 A28 28 0 0 1 84 48" stroke="white" strokeWidth="0.6" fill="none" opacity="0.08" />
      <Path d="M18 72 A22 22 0 0 0 40 72" stroke="white" strokeWidth="0.6" fill="none" opacity="0.08" />
      <G opacity="0.12">
        <Line x1="57" y1="62" x2="63" y2="62" stroke="white" strokeWidth="0.8" />
        <Line x1="60" y1="59" x2="60" y2="65" stroke="white" strokeWidth="0.8" />
      </G>
      <G opacity="0.12">
        <Line x1="22" y1="22" x2="28" y2="22" stroke="white" strokeWidth="0.8" />
        <Line x1="25" y1="19" x2="25" y2="25" stroke="white" strokeWidth="0.8" />
      </G>
      <G opacity="0.12">
        <Line x1="78" y1="85" x2="84" y2="85" stroke="white" strokeWidth="0.8" />
        <Line x1="81" y1="82" x2="81" y2="88" stroke="white" strokeWidth="0.8" />
      </G>
    </Svg>
  )
})

const OceanMotif = memo(function OceanMotif() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Path d="M0 28 Q25 22 50 28 Q75 34 100 28" stroke="white" strokeWidth="1.2" fill="none" opacity="0.12" />
      <Path d="M0 45 Q25 39 50 45 Q75 51 100 45" stroke="white" strokeWidth="1" fill="none" opacity="0.10" />
      <Path d="M0 62 Q25 56 50 62 Q75 68 100 62" stroke="white" strokeWidth="0.8" fill="none" opacity="0.09" />
      <Path d="M0 78 Q25 72 50 78 Q75 84 100 78" stroke="white" strokeWidth="0.8" fill="none" opacity="0.08" />
      <Circle cx="72" cy="18" r="2" fill="white" opacity="0.12" />
      <Circle cx="78" cy="12" r="1.5" fill="white" opacity="0.12" />
      <Circle cx="82" cy="20" r="1" fill="white" opacity="0.10" />
      <Circle cx="68" cy="14" r="1" fill="white" opacity="0.10" />
      <Circle cx="18" cy="72" r="2.5" fill="white" opacity="0.12" />
      <Circle cx="12" cy="78" r="1.5" fill="white" opacity="0.12" />
      <Circle cx="22" cy="80" r="1" fill="white" opacity="0.10" />
      <Circle cx="8" cy="70" r="1" fill="white" opacity="0.10" />
    </Svg>
  )
})

const CloudsMotif = memo(function CloudsMotif() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Path
        d="M10 55 Q8 46 15 43 Q13 33 22 35 Q25 26 35 27 Q39 19 50 22 Q60 16 66 25 Q76 23 77 33 Q86 34 85 44 Q90 49 86 55 Z"
        fill="white"
        opacity="0.08"
      />
      <Path
        d="M38 72 Q36 65 42 63 Q40 57 47 58 Q50 52 57 55 Q63 51 67 57 Q73 56 72 63 Q76 67 73 72 Z"
        fill="white"
        opacity="0.08"
      />
      <Path
        d="M60 38 Q58 33 63 32 Q62 27 68 28 Q71 24 76 27 Q81 25 81 31 Q85 34 82 38 Z"
        fill="white"
        opacity="0.09"
      />
      <Circle cx="25" cy="68" r="1.5" fill="white" opacity="0.10" />
      <Circle cx="45" cy="80" r="1.5" fill="white" opacity="0.10" />
      <Circle cx="65" cy="75" r="1.5" fill="white" opacity="0.10" />
      <Circle cx="80" cy="65" r="1.5" fill="white" opacity="0.10" />
    </Svg>
  )
})

const JungleMotif = memo(function JungleMotif() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Path d="M0 25 Q8 12 22 10 Q36 8 42 22 Q28 32 14 34 Q4 36 0 25 Z" fill="white" opacity="0.10" />
      <Line x1="5" y1="25" x2="38" y2="15" stroke="white" strokeWidth="0.5" opacity="0.08" />
      <Path d="M100 75 Q92 88 78 90 Q64 92 58 78 Q72 68 86 66 Q96 64 100 75 Z" fill="white" opacity="0.10" />
      <Line x1="95" y1="75" x2="62" y2="85" stroke="white" strokeWidth="0.5" opacity="0.08" />
      <Path d="M100 18 Q88 8 74 7 Q60 6 58 20 Q73 28 87 30 Q96 32 100 18 Z" fill="white" opacity="0.09" />
      <Line x1="95" y1="20" x2="62" y2="15" stroke="white" strokeWidth="0.5" opacity="0.07" />
      <Path d="M0 55 Q10 44 22 47 Q32 50 30 63 Q18 70 8 66 Q0 62 0 55 Z" fill="white" opacity="0.09" />
      <Line x1="4" y1="56" x2="28" y2="56" stroke="white" strokeWidth="0.5" opacity="0.07" />
      <Path d="M45 100 Q40 87 50 81 Q60 75 65 88 Q58 96 52 100 Z" fill="white" opacity="0.10" />
      <Line x1="50" y1="98" x2="52" y2="82" stroke="white" strokeWidth="0.5" opacity="0.08" />
      <G opacity="0.12">
        <Circle cx="20" cy="85" r="1.5" fill="white" />
        <Circle cx="17" cy="82" r="1.5" fill="white" />
        <Circle cx="23" cy="82" r="1.5" fill="white" />
        <Circle cx="20" cy="79" r="1.5" fill="white" />
        <Circle cx="20" cy="88" r="1.5" fill="white" />
      </G>
      <G opacity="0.12">
        <Circle cx="80" cy="30" r="1.5" fill="white" />
        <Circle cx="77" cy="27" r="1.5" fill="white" />
        <Circle cx="83" cy="27" r="1.5" fill="white" />
        <Circle cx="80" cy="24" r="1.5" fill="white" />
        <Circle cx="80" cy="33" r="1.5" fill="white" />
      </G>
      <G opacity="0.12">
        <Circle cx="55" cy="15" r="1.5" fill="white" />
        <Circle cx="52" cy="12" r="1.5" fill="white" />
        <Circle cx="58" cy="12" r="1.5" fill="white" />
        <Circle cx="55" cy="9" r="1.5" fill="white" />
        <Circle cx="55" cy="18" r="1.5" fill="white" />
      </G>
    </Svg>
  )
})

const MOTIF_COMPONENTS: Record<MotifKey, React.ComponentType> = {
  kingdom: KingdomMotif,
  forest: ForestMotif,
  space: SpaceMotif,
  ocean: OceanMotif,
  clouds: CloudsMotif,
  jungle: JungleMotif,
}

// ─── Main component ────────────────────────────────────────────────────────────

export const StoryCoverTile = memo(function StoryCoverTile({
  title,
  worldId,
  size,
  borderRadius,
  style,
}: StoryCoverTileProps) {
  const theme = WORLD_THEMES[worldId] ?? WORLD_THEMES.kingdom
  const config = SIZE_MAP[size]
  const MotifComponent = MOTIF_COMPONENTS[theme.motif]
  const displayTitle = title || theme.name
  const radius = borderRadius ?? Radii.cardLarge

  const containerStyle: ViewStyle = {
    ...config.containerStyle,
    overflow: 'hidden',
    borderRadius: radius,
  }

  return (
    <View style={[containerStyle, style]}>
      {/* Layer 1 — Gradient background */}
      <LinearGradient
        colors={theme.gradient}
        start={theme.gradientStart}
        end={theme.gradientEnd}
        style={StyleSheet.absoluteFill}
      />

      {/* Layer 2 — Ghost emoji */}
      <View style={styles.ghostContainer} pointerEvents="none">
        <Text
          style={[
            styles.ghostEmoji,
            {
              fontSize: config.emojiSize * 2.2,
              transform: [{ rotate: theme.ghostRotation }],
            },
          ]}
        >
          {theme.emoji}
        </Text>
      </View>

      {/* Layer 3 — SVG decorative motif */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <MotifComponent />
      </View>

      {/* Layer 4 — Content */}
      <View style={styles.contentLayer}>
        {/* Top badge (hidden on sm) */}
        {config.showBadge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>{theme.emoji}</Text>
            <Text style={[styles.badgeText, { color: theme.titleColor }]} numberOfLines={1}>
              {theme.name}
            </Text>
          </View>
        ) : null}

        {/* Center title */}
        <Text
          style={[
            styles.titleText,
            {
              fontSize: config.titleSize,
              lineHeight: config.titleSize * 1.35,
              color: theme.titleColor,
              paddingHorizontal: config.titlePaddingH,
            },
          ]}
          numberOfLines={config.lines}
          ellipsizeMode="tail"
        >
          {displayTitle}
        </Text>

        {/* Bottom sparkle row (hidden on sm) */}
        {config.showBadge ? (
          <View style={styles.sparkleRow}>
            <Text style={[styles.sparkle, { color: theme.titleColor }]}>✦</Text>
            <Text style={[styles.sparkleDot, { color: theme.titleColor }]}>·</Text>
            <Text style={[styles.sparkleDot, { color: theme.titleColor }]}>·</Text>
          </View>
        ) : null}
      </View>
    </View>
  )
})

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  ghostContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.12,
  },
  ghostEmoji: {
    textAlign: 'center',
  },
  contentLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeEmoji: {
    fontSize: 11,
  },
  badgeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 10,
    opacity: 0.8,
  },
  titleText: {
    fontFamily: 'Fraunces_500Medium',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sparkleRow: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.5,
  },
  sparkle: {
    fontSize: 7,
  },
  sparkleDot: {
    fontSize: 6,
  },
})
