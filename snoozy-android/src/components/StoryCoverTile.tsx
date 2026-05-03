/**
 * StoryCoverTile — World illustration cover tiles for Snoozy.
 * Each world maps to a real illustrated image. Text overlays (badge + title)
 * are only rendered when showTitle=true, keeping library grid cards pure art.
 *
 * Sizes:
 *   sm   — 72×72 thumbnail (HomeScreen ContinueListening). No overlays.
 *   md   — Full-width square (LibraryScreen grid). showTitle=false → pure image.
 *   lg   — Full-width square, larger text. Used for featured cards.
 *   hero — Full-width 320px tall (StoryPlayerScreen). showTitle=true → cinematic overlay.
 */
import React, { memo } from 'react'
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Radii } from '@/config/tokens'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface StoryCoverTileProps {
  title: string
  worldId: string
  size: 'sm' | 'md' | 'lg' | 'hero'
  borderRadius?: number
  showTitle?: boolean
  style?: ViewStyle
}

type SizeConfig = {
  titleSize: number
  lines: number
  containerStyle: ViewStyle
  showBadge: boolean
  titlePaddingH: number
}

// ─── Size map ──────────────────────────────────────────────────────────────────

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'hero', SizeConfig> = {
  sm: {
    titleSize: 9,
    lines: 2,
    containerStyle: { width: 72, height: 72 },
    showBadge: false,
    titlePaddingH: 6,
  },
  md: {
    titleSize: 16,
    lines: 3,
    containerStyle: { width: '100%', aspectRatio: 1 },
    showBadge: true,
    titlePaddingH: 14,
  },
  lg: {
    titleSize: 20,
    lines: 3,
    containerStyle: { width: '100%', aspectRatio: 1 },
    showBadge: true,
    titlePaddingH: 16,
  },
  hero: {
    titleSize: 24,
    lines: 4,
    containerStyle: { width: '100%', height: 320 },
    showBadge: true,
    titlePaddingH: 24,
  },
}

// ─── World map ─────────────────────────────────────────────────────────────────

type WorldMeta = {
  emoji: string
  name: string
}

const WORLD_META: Record<string, WorldMeta> = {
  // World picker IDs
  kingdom:            { emoji: '🏰', name: 'Magical Kingdom' },
  forest:             { emoji: '🌲', name: 'Enchanted Forest' },
  space:              { emoji: '🚀', name: 'Outer Space' },
  ocean:              { emoji: '🐠', name: 'Ocean Deep' },
  clouds:             { emoji: '☁️', name: 'Cloud Kingdom' },
  jungle:             { emoji: '🦁', name: 'Magical Safari' },
  // Template picker IDs
  'dreamland':          { emoji: '🌙', name: 'Dreamland' },
  'animal-friends':     { emoji: '🦊', name: 'Animal Friends' },
  'under-the-stars':    { emoji: '✨', name: 'Under the Stars' },
  'underwater-journey': { emoji: '🐠', name: 'Underwater' },
  'space-explorer':     { emoji: '🚀', name: 'Space Explorer' },
  'fairy-garden':       { emoji: '🌸', name: 'Fairy Garden' },
  'snowy-mountain':     { emoji: '❄️', name: 'Snowy Mountain' },
  'rainy-day-cozy':     { emoji: '🌧️', name: 'Rainy Day' },
}

// Bundled at build time — require() calls must be static literals.
const WORLD_IMAGES = {
  // World picker IDs
  kingdom:            require('../../assets/images/worlds/world-kingdom.png'),
  forest:             require('../../assets/images/worlds/world-forest.png'),
  space:              require('../../assets/images/worlds/world-space.png'),
  ocean:              require('../../assets/images/worlds/world-ocean.png'),
  clouds:             require('../../assets/images/worlds/world-clouds.png'),
  jungle:             require('../../assets/images/worlds/world-jungle.png'),
  // Template picker IDs mapped to closest world image
  'dreamland':          require('../../assets/images/worlds/world-kingdom.png'),
  'animal-friends':     require('../../assets/images/worlds/world-jungle.png'),
  'under-the-stars':    require('../../assets/images/worlds/world-space.png'),
  'underwater-journey': require('../../assets/images/worlds/world-ocean.png'),
  'space-explorer':     require('../../assets/images/worlds/world-space.png'),
  'fairy-garden':       require('../../assets/images/worlds/world-forest.png'),
  'snowy-mountain':     require('../../assets/images/worlds/world-clouds.png'),
  'rainy-day-cozy':     require('../../assets/images/worlds/world-forest.png'),
} as const

// ─── Component ─────────────────────────────────────────────────────────────────

export const StoryCoverTile = memo(function StoryCoverTile({
  title,
  worldId,
  size,
  borderRadius,
  showTitle = true,
  style,
}: StoryCoverTileProps) {
  const meta   = WORLD_META[worldId] ?? WORLD_META.kingdom
  const image  = WORLD_IMAGES[worldId as keyof typeof WORLD_IMAGES] ?? WORLD_IMAGES.kingdom
  const config = SIZE_MAP[size]
  const radius = borderRadius ?? Radii.cardLarge

  // Overlays (badge + title) only appear when showTitle is explicitly enabled.
  // Library grid cards pass showTitle={false} → pure illustration, zero overlays.
  const hasOverlay = showTitle && config.showBadge

  const containerStyle: ViewStyle = {
    ...config.containerStyle,
    overflow: 'hidden',
    borderRadius: radius,
  }

  return (
    <View style={[containerStyle, style]}>

      {/* Layer 1 — World illustration */}
      <Image
        source={image}
        style={styles.worldImage}
        resizeMode="contain"
      />

      {/* Layer 2 — Top scrim: darkens upper edge so the badge pill is legible */}
      {hasOverlay && (
        <LinearGradient
          colors={['rgba(0,0,0,0.52)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.topScrim}
        />
      )}

      {/* Layer 3 — Bottom scrim: vignettes the lower area so title text reads clearly */}
      {hasOverlay && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.68)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.bottomScrim}
        />
      )}

      {/* Layer 4 — Content: badge + title + sparkles */}
      {hasOverlay && (
        <View style={styles.contentLayer}>

          {/* World badge — top-left pill */}
          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>{meta.emoji}</Text>
            <Text style={styles.badgeText} numberOfLines={1}>
              {meta.name}
            </Text>
          </View>

          {/* Story title — centered over the bottom vignette */}
          <Text
            style={[
              styles.titleText,
              {
                fontSize: config.titleSize,
                lineHeight: config.titleSize * 1.35,
                paddingHorizontal: config.titlePaddingH,
              },
            ]}
            numberOfLines={config.lines}
            ellipsizeMode="tail"
          >
            {title || meta.name}
          </Text>

          {/* Decorative sparkles above the bottom edge */}
          <View style={styles.sparkleRow}>
            <Text style={styles.sparkle}>✦</Text>
            <Text style={styles.sparkleDot}>·</Text>
            <Text style={styles.sparkleDot}>·</Text>
          </View>
        </View>
      )}

    </View>
  )
})

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  worldImage: {
    width: '100%',
    height: '100%',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '58%',
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
    backgroundColor: 'rgba(0,0,0,0.28)',
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
    color: 'rgba(255,255,255,0.92)',
  },
  titleText: {
    fontFamily: 'Fraunces_500Medium',
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  sparkleRow: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.55,
  },
  sparkle: {
    fontSize: 7,
    color: '#FFFFFF',
  },
  sparkleDot: {
    fontSize: 6,
    color: '#FFFFFF',
  },
})
