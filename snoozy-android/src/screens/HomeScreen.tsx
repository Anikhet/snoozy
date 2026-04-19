import React, { useCallback } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing, getLiftShadow } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { Screen } from '@/types/navigation'
import { Story } from '@/types/story'
import { StoryRow } from '@/components/StoryRow'
import { IllustrationPlaceholder } from '@/components/Visuals'

function getGreetingLead(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 22) return 'Good evening'
  return 'Sleepy time'
}

function getDayEyebrow(): string {
  const now = new Date()
  const day = now.toLocaleDateString(undefined, { weekday: 'long' })
  const hour = now.getHours()
  const moment =
    hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : hour < 22 ? 'Evening' : 'Night'
  return `${day}, ${moment}`
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
    [playStory],
  )

  const handleRetry = useCallback(
    (id: string) => {
      const story = useStoryStore.getState().savedStories.find((s) => s.id === id)
      if (story) retryStory(story)
    },
    [retryStory],
  )

  const handleDelete = useCallback(
    (id: string) => {
      const story = useStoryStore.getState().savedStories.find((s) => s.id === id)
      if (story) deleteStory(story)
    },
    [deleteStory],
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
    [handlePlay, handleDelete, handleRetry],
  )

  const keyExtractor = useCallback((item: Story) => item.id, [])

  return (
    <FlatList
      data={savedStories}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: Spacing.xxl }]}
      ListHeaderComponent={
        <View>
          {/* Top bar */}
          <View style={styles.topBar}>
            <View
              style={[
                styles.wordmark,
                { backgroundColor: colors.surface, borderColor: colors.hair },
              ]}
            >
              <Text style={[styles.wordmarkLetter, { color: colors.primary }]}>s</Text>
            </View>
            <View style={{ flex: 1 }} />
            <LinearGradient
              colors={[colors.accent, colors.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.avatar, { borderColor: colors.surface }]}
            />
          </View>

          {/* Greeting hero */}
          <View style={styles.greeting}>
            <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>
              {getDayEyebrow().toUpperCase()}
            </Text>
            <Text
              style={[Fonts.serifDisplay, { color: colors.ink, marginTop: 6 }]}
            >
              {getGreetingLead()},
            </Text>
            <Text
              style={[
                Fonts.serifDisplay,
                {
                  color: colors.primary,
                  fontFamily: 'Fraunces_400Regular_Italic',
                },
              ]}
            >
              what shall we
            </Text>
            <Text
              style={[
                Fonts.serifDisplay,
                {
                  color: colors.primary,
                  fontFamily: 'Fraunces_400Regular_Italic',
                },
              ]}
            >
              dream of tonight?
            </Text>
          </View>

          {/* Tonight's ritual CTA */}
          <Pressable onPress={handleNewStory}>
            <LinearGradient
              colors={[colors.ink, '#3D3142']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.cta, getLiftShadow(isDark)]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[Fonts.eyebrow, { color: colors.accent }]}
                >
                  TONIGHT'S RITUAL
                </Text>
                <Text
                  style={[
                    Fonts.serifHeadline,
                    {
                      color: colors.background,
                      fontSize: 20,
                      marginTop: 2,
                    },
                  ]}
                >
                  Write a new story
                </Text>
              </View>
              <View style={[styles.ctaArrow, { backgroundColor: colors.accent }]}>
                <Text style={[styles.ctaArrowText, { color: colors.ink }]}>→</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Library header */}
          <View style={styles.libraryHeader}>
            <Text
              style={[
                Fonts.serifHeadline,
                {
                  fontSize: 20,
                  color: colors.ink,
                  fontFamily: 'Fraunces_500Medium_Italic',
                },
              ]}
            >
              Your library
            </Text>
            <Text style={[Fonts.caption, { color: colors.inkSoft }]}>
              {savedStories.length === 0
                ? 'No stories yet'
                : `${savedStories.length} ${savedStories.length === 1 ? 'story' : 'stories'}`}
            </Text>
          </View>

          {savedStories.length === 0 ? (
            <View style={{ marginTop: 8 }}>
              <IllustrationPlaceholder
                palette={[colors.cardLavender, colors.cardCosmos, colors.primarySoft]}
                label="library illustration"
                height={120}
              />
              <Text
                style={[
                  Fonts.body,
                  {
                    color: colors.inkSoft,
                    textAlign: 'center',
                    marginTop: 10,
                    fontSize: 14,
                  },
                ]}
              >
                Your stories will gather here — like a little bedside shelf.
              </Text>
            </View>
          ) : null}
        </View>
      }
    />
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkLetter: {
    fontFamily: 'Fraunces_500Medium_Italic',
    fontSize: 20,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
  },
  greeting: {
    marginTop: 20,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 20,
    paddingHorizontal: 20,
    marginTop: 18,
  },
  ctaArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaArrowText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
  },
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 24,
    marginBottom: 8,
  },
})
