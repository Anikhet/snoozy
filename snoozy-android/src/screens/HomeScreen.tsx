import React, { useCallback } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing, Radii, getLiftShadow } from '@/config/tokens'
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
      {savedStories.length > 0 ? (
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={[Fonts.title3Italic, { color: colors.ink }]}>
              Your library
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.countText, { color: colors.primaryInk }]}>
                {savedStories.length}
              </Text>
            </View>
          </View>
          <FlatList
            data={savedStories}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={ListSeparator}
          />
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[Fonts.serifBodyRegularItalic, { color: colors.inkMute, textAlign: 'center' }]}>
            Stories you create will appear here.
          </Text>
        </View>
      )}
    </View>
  )
}

function ListSeparator() {
  return <View style={{ height: 10 }} />
}

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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  countText: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
})
