import React, { useCallback, useEffect } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { useThemeColors } from '@/hooks/useThemeColors'
import { AppIcon } from '@/components/AppIcon'
import { Fonts, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { Screen } from '@/types/navigation'
import { Story, StoryStatus } from '@/types/story'
import { SnoozyButton } from '@/components/SnoozyButton'
import { StoryRow } from '@/components/StoryRow'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good Morning'
  if (hour >= 12 && hour < 17) return 'Good Afternoon'
  if (hour >= 17 && hour < 21) return 'Good Evening'
  return 'Sleepy Time'
}

export function HomeScreen() {
  const { colors } = useThemeColors()
  const savedStories = useStoryStore((s) => s.savedStories)
  const navigateTo = useStoryStore((s) => s.navigateTo)
  const playStory = useStoryStore((s) => s.playStory)
  const deleteStory = useStoryStore((s) => s.deleteStory)
  const retryStory = useStoryStore((s) => s.retryStory)

  const scale = useSharedValue(1)

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    )
  }, [scale])

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

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
    [handlePlay, handleRetry]
  )

  const keyExtractor = useCallback((item: Story) => item.id, [])

  return (
    <View style={[styles.root, { paddingHorizontal: Spacing.lg }]}>
      <View style={styles.header}>
        <View style={styles.spacerXxl} />

        <Animated.View style={pulseStyle}>
          <AppIcon name="moon.stars.fill" size={44} color={colors.primary} />
        </Animated.View>

        <Text style={[Fonts.largeTitle, { color: colors.textPrimary }]}>
          {getGreeting()}
        </Text>

        <Text style={[Fonts.body, { color: colors.textSecondary }]}>
          Ready for a bedtime story?
        </Text>

        <View style={styles.spacerLg} />

        <SnoozyButton title="New Story" icon="add" onPress={handleNewStory} />

        <View style={styles.spacerXl} />
      </View>

      {savedStories.length === 0 ? (
        <EmptyState colors={colors} />
      ) : (
        <View style={styles.listSection}>
          <Text style={[Fonts.headline, { color: colors.textPrimary }]}>
            Your Stories
          </Text>
          <FlatList
            data={savedStories}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={ListSeparator}
          />
        </View>
      )}
    </View>
  )
}

function EmptyState({ colors }: { colors: ReturnType<typeof useThemeColors>['colors'] }) {
  return (
    <View style={styles.emptyState}>
      <AppIcon
        name="book.closed.fill"
        size={36}
        color={colors.textSecondary + '80'}
      />
      <Text style={[Fonts.headline, { color: colors.textSecondary }]}>
        No stories yet
      </Text>
      <Text
        style={[Fonts.caption, { color: colors.textSecondary + 'B3' }]}
      >
        Create your first bedtime story!
      </Text>
    </View>
  )
}

function ListSeparator() {
  return <View style={{ height: Spacing.sm }} />
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  listSection: {
    flex: 1,
    gap: Spacing.sm,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  spacerXxl: {
    height: Spacing.xxl,
  },
  spacerLg: {
    height: Spacing.lg,
  },
  spacerXl: {
    height: Spacing.xl,
  },
})
