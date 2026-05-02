import React, { useCallback } from 'react'
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing, Radii, ThemeColors, getLiftShadow } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { Screen } from '@/types/navigation'
import { Story, StoryStatus } from '@/types/story'
import { StoryRow } from '@/components/StoryRow'
import { Constellation } from '@/components/Constellation'

function getGreetingParts(): { eyebrow: string; line1: string } {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return { eyebrow: 'GOOD MORNING', line1: 'Good morning,' }
  if (hour >= 12 && hour < 17) return { eyebrow: 'GOOD AFTERNOON', line1: 'Good afternoon,' }
  if (hour >= 17 && hour < 21) return { eyebrow: 'GOOD EVENING', line1: 'Good evening,' }
  return { eyebrow: 'SLEEPY TIME', line1: 'Sleepy time,' }
}

export function HomeScreen() {
  const { colors, isDark } = useThemeColors()
  const savedStories = useStoryStore((s) => s.savedStories)
  const navigateTo = useStoryStore((s) => s.navigateTo)
  const playStory = useStoryStore((s) => s.playStory)
  const deleteStory = useStoryStore((s) => s.deleteStory)
  const retryStory = useStoryStore((s) => s.retryStory)

  const handleNewStory = useCallback(() => {
    navigateTo(Screen.TemplatePicker)
  }, [navigateTo])

  const handlePlay = useCallback(
    (id: string) => {
      const story = useStoryStore.getState().savedStories.find((s) => s.id === id)
      if (story) playStory(story)
    },
    [playStory]
  )

  const handleRetry = useCallback(
    (id: string) => {
      const story = useStoryStore.getState().savedStories.find((s) => s.id === id)
      if (story) retryStory(story)
    },
    [retryStory]
  )

  const handleDelete = useCallback(
    (id: string) => {
      const story = useStoryStore.getState().savedStories.find((s) => s.id === id)
      if (story) deleteStory(story)
    },
    [deleteStory]
  )

  const renderItem = useCallback(
    ({ item }: { item: Story }) => (
      <StoryRow
        id={item.id}
        title={item.title}
        templateId={item.templateId}
        childName={item.childName}
        createdAt={item.createdAt}
        status={item.status}
        onPlay={handlePlay}
        onDelete={handleDelete}
        onRetry={handleRetry}
      />
    ),
    [handleDelete, handlePlay, handleRetry]
  )

  const keyExtractor = useCallback((item: Story) => item.id, [])
  const greeting = getGreetingParts()

  return (
    <View style={[styles.root, { paddingHorizontal: Spacing.lg }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={[styles.logoMark, { backgroundColor: colors.surface, borderColor: colors.hair }]}>
          <Text style={[styles.logoText, { color: colors.primary }]}>s</Text>
        </View>
        <View style={styles.flex} />
        <LinearGradient
          colors={[colors.accent, colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={[styles.avatarInner, { backgroundColor: colors.surface }]}>
            <Ionicons name="person" size={16} color={colors.inkSoft} />
          </View>
        </LinearGradient>
      </View>

      {/* Greeting hero */}
      <View style={styles.greetingSection}>
        <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>
          {greeting.eyebrow}
        </Text>
        <Text style={[Fonts.serifDisplay, { color: colors.ink }]}>
          {greeting.line1}
        </Text>
        <Text style={[Fonts.serifDisplayItalic, { color: colors.primary }]}>
          what shall we
        </Text>
        <Text style={[Fonts.serifDisplayItalic, { color: colors.primary }]}>
          dream of tonight?
        </Text>
        <View style={styles.constellationOverlay}>
          <Constellation color={colors.primary} opacity={0.25} />
        </View>
      </View>

      {/* New Story CTA */}
      <Pressable onPress={handleNewStory}>
        <LinearGradient
          colors={[colors.ink, '#3D3142']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ctaCard, getLiftShadow(isDark)]}
        >
          <View style={styles.ctaContent}>
            <View style={styles.ctaCopy}>
              <Text style={[Fonts.eyebrow, { color: colors.accent, fontSize: 10 }]}>
                TONIGHT&apos;S RITUAL
              </Text>
              <Text style={[Fonts.title3, { color: colors.background }]}>
                Write a new story
              </Text>
            </View>
            <View style={[styles.ctaArrow, { backgroundColor: colors.accent }]}>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </View>
          </View>
        </LinearGradient>
      </Pressable>

      {/* Library */}
      <View style={styles.listSection}>
        <View style={styles.libraryHeader}>
          <Text style={[Fonts.title3Italic, { color: colors.ink }]}>
            Your library
          </Text>
          <Text style={[styles.libraryCount, { color: colors.inkSoft }]}>
            {savedStories.length === 0
              ? 'No stories yet'
              : `${savedStories.length} ${savedStories.length === 1 ? 'story' : 'stories'}`}
          </Text>
        </View>

        {savedStories.length > 0 ? (
          <FlatList
            data={savedStories}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={ListSeparator}
          />
        ) : (
          <LibraryEmptyState isDark={isDark} colors={colors} />
        )}
      </View>
    </View>
  )
}

interface EmptyStateProps {
  isDark: boolean
  colors: ThemeColors
}

/**
 * Editorial empty-state for the library — soft gradient illustration card
 * with abstract circles + speckle stars, mirrors iOS IllustrationPlaceholder.
 */
function LibraryEmptyState({ isDark, colors }: EmptyStateProps) {
  const { width: screenWidth } = useWindowDimensions()
  const cardWidth = screenWidth - Spacing.lg * 2
  const cardHeight = 120

  const palette = isDark
    ? ['#2E2B4A', '#2A254A', colors.primarySoft]
    : ['#E8E5FF', '#DCD5F1', colors.primarySoft]

  // 12 deterministic speckle stars, seed=1, matching iOS arithmetic.
  const stars = Array.from({ length: 12 }, (_, i) => {
    const x = (i * 73 + 31) % Math.max(1, Math.round(cardWidth))
    const y = (i * 47 + 19) % Math.max(1, cardHeight)
    const r = 0.6 + (i % 3) * 0.4
    return { x, y, size: r * 2 }
  })

  return (
    <View style={emptyStyles.wrapper}>
      <View style={[emptyStyles.illustration, { width: cardWidth }]}>
        <LinearGradient
          colors={[palette[1], palette[0]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={emptyStyles.gradient}
        />

        {/* Three overlapping circles */}
        <View
          style={[
            emptyStyles.circle,
            {
              width: cardHeight * 0.84,
              height: cardHeight * 0.84,
              borderRadius: (cardHeight * 0.84) / 2,
              backgroundColor: palette[0],
              opacity: 0.75,
              left: cardWidth * 0.5 - cardHeight * 0.42 - cardWidth * 0.2,
              top: cardHeight * 0.5 - cardHeight * 0.42,
            },
          ]}
        />
        <View
          style={[
            emptyStyles.circle,
            {
              width: cardHeight * 0.64,
              height: cardHeight * 0.64,
              borderRadius: (cardHeight * 0.64) / 2,
              backgroundColor: palette[1],
              opacity: 0.75,
              left: cardWidth * 0.5 - cardHeight * 0.32 + cardWidth * 0.2,
              top: cardHeight * 0.5 - cardHeight * 0.32 - cardHeight * 0.1,
            },
          ]}
        />
        <View
          style={[
            emptyStyles.circle,
            {
              width: cardHeight * 0.44,
              height: cardHeight * 0.44,
              borderRadius: (cardHeight * 0.44) / 2,
              backgroundColor: palette[2],
              opacity: 0.75,
              left: cardWidth * 0.5 - cardHeight * 0.22 + cardWidth * 0.05,
              top: cardHeight * 0.5 - cardHeight * 0.22 + cardHeight * 0.2,
            },
          ]}
        />

        {/* Speckle stars */}
        {stars.map((s, i) => (
          <View
            key={i}
            style={[
              emptyStyles.star,
              {
                width: s.size,
                height: s.size,
                borderRadius: s.size / 2,
                left: s.x,
                top: s.y,
              },
            ]}
          />
        ))}

        <Text style={[emptyStyles.label, { color: `${colors.ink}73` }]}>
          LIBRARY ILLUSTRATION
        </Text>
      </View>

      <Text style={[emptyStyles.copy, { color: colors.inkSoft }]}>
        Your stories will gather here {'—'} like a little bedside shelf.
      </Text>
    </View>
  )
}

function ListSeparator() {
  return <View style={separatorStyle} />
}

const separatorStyle = { height: 10 } as const

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_500Medium_Italic',
    fontWeight: '600',
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingSection: {
    gap: 0,
  },
  constellationOverlay: {
    position: 'absolute',
    right: -10,
    top: 0,
  },
  ctaCard: {
    height: 64,
    borderRadius: Radii.card,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaCopy: {
    flex: 1,
    gap: 2,
  },
  ctaArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSection: {
    flex: 1,
    gap: Spacing.sm,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  libraryCount: {
    marginLeft: 'auto',
    fontSize: 12,
    fontFamily: 'Nunito_600SemiBold',
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
})

const emptyStyles = StyleSheet.create({
  wrapper: {
    paddingVertical: 16,
    gap: 10,
  },
  illustration: {
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  circle: {
    position: 'absolute',
  },
  star: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  label: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    fontSize: 11,
    fontFamily: 'Nunito_500Medium',
    letterSpacing: 0.4,
  },
  copy: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    paddingTop: 4,
    paddingHorizontal: 8,
  },
})
