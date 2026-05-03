import React, { useState } from 'react'
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColors } from '@/hooks/useThemeColors'
import {
  Fonts,
  Radii,
  Sizing,
  Spacing,
  getCardShadow,
  getLiftShadow,
} from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// TILE_WIDTH: screen minus card horizontal margins (lg each side) + card paddings (md each side) + gap
const TILE_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2 - 10) / 2

const WORLDS = [
  { id: 'kingdom', emoji: '🏰', name: 'Magical Kingdom', subtitle: 'Castles & gentle quests' },
  { id: 'forest',  emoji: '🌲', name: 'Enchanted Forest', subtitle: 'Animals & cozy cottages' },
  { id: 'space',   emoji: '🚀', name: 'Outer Space',      subtitle: 'Planets & singing stars' },
  { id: 'ocean',   emoji: '🐠', name: 'Ocean Deep',       subtitle: 'Warm seas & sea creatures' },
  { id: 'clouds',  emoji: '☁️', name: 'Cloud Kingdom',    subtitle: 'Sky islands & soft winds' },
  { id: 'jungle',  emoji: '🦁', name: 'Magical Safari',   subtitle: 'Golden plains & gentle giants' },
]

const VIBES = [
  { id: 'cozy',    emoji: '🌙', name: 'Sleepy & Cozy' },
  { id: 'brave',   emoji: '💪', name: 'Be Brave' },
  { id: 'kind',    emoji: '🤝', name: 'Be Kind' },
  { id: 'wonder',  emoji: '🌟', name: 'Full of Wonder' },
  { id: 'friends', emoji: '🐾', name: 'Make a Friend' },
]

interface WorldTileProps {
  world: (typeof WORLDS)[number]
  selected: boolean
  onSelect: (id: string) => void
  colors: ReturnType<typeof useThemeColors>['colors']
}

function WorldTile({ world, selected, onSelect, colors }: WorldTileProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={[{ width: TILE_WIDTH }, animatedStyle]}>
      <Pressable
        onPress={() => onSelect(world.id)}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 15 })
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 })
        }}
        style={[
          styles.worldTile,
          {
            backgroundColor: selected ? colors.primary : colors.worldCardBg,
          },
        ]}
      >
        <Text style={styles.worldEmoji}>{world.emoji}</Text>
        <Text
          style={[
            Fonts.bodyBold,
            { color: selected ? '#FFFFFF' : colors.ink, marginTop: 6 },
          ]}
          numberOfLines={1}
        >
          {world.name}
        </Text>
        <Text
          style={[
            Fonts.caption,
            {
              color: selected ? 'rgba(255,255,255,0.8)' : colors.inkMute,
              marginTop: 2,
            },
          ]}
          numberOfLines={2}
        >
          {world.subtitle}
        </Text>
        {selected ? (
          <Ionicons
            name="checkmark-circle"
            size={16}
            color="#FFFFFF"
            style={styles.worldCheck}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  )
}

export default function WorldPickerScreen() {
  const { colors, isDark } = useThemeColors()
  const goHome = useStoryStore((s) => s.goHome)
  const navigateToStoryConfig = useStoryStore((s) => s.navigateToStoryConfig)

  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null)
  const [selectedVibeId, setSelectedVibeId] = useState<string | null>(null)

  const canProceed = selectedWorldId !== null && selectedVibeId !== null

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.surface, ...getCardShadow(isDark) }]}
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        </View>

        {/* Hero text */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.heroText}
        >
          <Text style={[Fonts.serifTitle, { color: colors.ink, textAlign: 'center' }]}>
            Let's create
          </Text>
          <View style={styles.heroLine2}>
            <Text style={[Fonts.serifTitle, { color: colors.primary, textAlign: 'center' }]}>
              a bedtime story
            </Text>
            <Text style={[styles.starAccent, { color: colors.starGold }]}>✦</Text>
          </View>
          <Text
            style={[
              Fonts.body,
              {
                color: colors.inkSoft,
                textAlign: 'center',
                marginTop: Spacing.sm,
                paddingHorizontal: Spacing.xl,
              },
            ]}
          >
            Tell me what your little dreamer would love tonight.
          </Text>
        </Animated.View>

        {/* Mascot — overlaps card via negative margin */}
        <Animated.View
          entering={FadeIn.delay(200).duration(500)}
          style={styles.mascotWrapper}
        >
          <Image
            source={require('../../assets/images/mascot-peeking.png')}
            style={styles.mascot}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Selection card */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(500)}
          style={[
            styles.card,
            { backgroundColor: colors.surface, ...getCardShadow(isDark) },
          ]}
        >
          {/* World grid */}
          <Text style={[Fonts.eyebrow, { color: colors.inkMute, marginBottom: Spacing.sm }]}>
            PICK A WORLD
          </Text>
          <View style={styles.worldGrid}>
            {WORLDS.map((world) => (
              <WorldTile
                key={world.id}
                world={world}
                selected={selectedWorldId === world.id}
                onSelect={setSelectedWorldId}
                colors={colors}
              />
            ))}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.hair }]} />

          {/* Vibe selection */}
          <Text style={[Fonts.eyebrow, { color: colors.inkMute, marginBottom: Spacing.sm }]}>
            TONIGHT'S VIBE
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vibeRow}
          >
            {VIBES.map((vibe) => {
              const isSelected = selectedVibeId === vibe.id
              return (
                <Pressable
                  key={vibe.id}
                  onPress={() => setSelectedVibeId(vibe.id)}
                  style={[
                    styles.vibePill,
                    {
                      backgroundColor: isSelected ? colors.vibeSelected : colors.surface,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.vibeSelected : colors.primary,
                    },
                  ]}
                >
                  <Text style={styles.vibeEmoji}>{vibe.emoji}</Text>
                  <Text
                    style={[
                      styles.vibeName,
                      {
                        color: isSelected
                          ? (colors.vibeSelectedText as string)
                          : colors.primary,
                      },
                    ]}
                  >
                    {vibe.name}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </Animated.View>

        {/* Bottom spacer for sticky CTA */}
        <View style={styles.ctaSpacer} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.stickyBar}>
        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.stickyFade}
          pointerEvents="none"
        />
        <View style={[styles.stickyContent, { backgroundColor: colors.background }]}>
          <Pressable
            onPress={() =>
              canProceed && navigateToStoryConfig(selectedWorldId!, selectedVibeId!)
            }
            disabled={!canProceed}
            style={{ opacity: canProceed ? 1 : 0.5 }}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.primary, '#9B8EC4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.ctaGradient, getLiftShadow(isDark)]}
            >
              <Text style={[Fonts.buttonLabel, styles.ctaLabel]}>✦  Begin the Story</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingBottom: Sizing.buttonHeight + Spacing.xxl,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    paddingTop: Spacing.lg,
    alignItems: 'center',
  },
  heroLine2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starAccent: {
    fontSize: 22,
  },
  mascotWrapper: {
    alignItems: 'center',
    marginBottom: -60,
    zIndex: 1,
  },
  mascot: {
    width: SCREEN_WIDTH * 0.32,
    height: SCREEN_WIDTH * 0.32,
  },
  card: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.cardLarge,
    paddingTop: 72,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  worldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  worldTile: {
    borderRadius: Radii.card,
    padding: 14,
    minHeight: 100,
  },
  worldEmoji: {
    fontSize: 28,
  },
  worldCheck: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.md,
  },
  vibeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: Spacing.md,
  },
  vibePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 50,
    gap: 6,
  },
  vibeEmoji: {
    fontSize: 16,
  },
  vibeName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
  },
  ctaSpacer: {
    height: Sizing.buttonHeight + Spacing.xxl,
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  stickyFade: {
    height: 60,
  },
  stickyContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  ctaGradient: {
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    color: '#FFFFFF',
  },
})
