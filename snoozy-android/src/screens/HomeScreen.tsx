import React, { useCallback, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
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
import { Story, StoryStatus } from '@/types/story'
import { StoryRow } from '@/components/StoryRow'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

function getGreetingLead(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning,'
  if (hour >= 12 && hour < 17) return 'Good afternoon,'
  if (hour >= 17 && hour < 22) return 'Good evening,'
  return 'Sleepy time,'
}

export function HomeScreen() {
  const { colors, isDark } = useThemeColors()
  const savedStories = useStoryStore((s) => s.savedStories)
  const navigateToWorldPicker = useStoryStore((s) => s.navigateToWorldPicker)
  const playStory = useStoryStore((s) => s.playStory)
  const deleteStory = useStoryStore((s) => s.deleteStory)
  const retryStory = useStoryStore((s) => s.retryStory)
  const currentStory = useStoryStore((s) => s.currentStory)
  const currentTime = useStoryStore((s) => s.currentTime)
  const duration = useStoryStore((s) => s.duration)
  const childDetails = useStoryStore((s) => s.childDetails)

  const [showSticky, setShowSticky] = useState(false)

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      setShowSticky(e.nativeEvent.contentOffset.y > 300)
    },
    [],
  )

  const continuationStory =
    currentStory?.status === StoryStatus.Ready && currentTime > 0 ? currentStory : null
  const progressRatio = duration > 0 ? Math.min(currentTime / duration, 1) : 0
  const timeRemaining =
    duration > 0 && currentTime > 0
      ? `${Math.ceil((duration - currentTime) / 60)} min left`
      : null

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
  const childName = childDetails.name || 'Dreamer'

  const ctaButton = (
    <Pressable onPress={navigateToWorldPicker} accessibilityRole="button">
      <LinearGradient
        colors={[colors.primary, '#9B8EC4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.ctaGradient, getLiftShadow(isDark)]}
      >
        <Text style={[Fonts.buttonLabel, styles.ctaLabel]}>✦  Create a Story</Text>
      </LinearGradient>
    </Pressable>
  )

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {/* Full-bleed background illustration */}
      <ImageBackground
        source={require('../../assets/images/bg-home.png')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', `${colors.background}AA`, colors.background]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <FlatList
        data={savedStories}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Top bar */}
            <View style={styles.topBar}>
              <View style={styles.wordmarkRow}>
                <View
                  style={[
                    styles.wordmarkBox,
                    { borderColor: colors.primary, backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.wordmarkLetter, { color: colors.primary }]}>S</Text>
                </View>
                <Text style={[Fonts.bodyBold, { color: colors.ink }]}>Snoozy</Text>
              </View>
              <Pressable
                style={[styles.settingsBtn, { backgroundColor: colors.surface, ...getCardShadow(isDark) }]}
                accessibilityRole="button"
                accessibilityLabel="Settings"
              >
                <Ionicons name="settings-outline" size={22} color={colors.inkSoft} />
              </Pressable>
            </View>

            {/* Greeting */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.greeting}>
              <Text style={[Fonts.body, { color: colors.inkSoft }]}>{getGreetingLead()}</Text>
              <View style={styles.nameRow}>
                <Text style={[styles.childName, { color: colors.ink }]}>{childName}</Text>
                <Text style={[styles.starGlyph, { color: colors.starGold }]}>✦</Text>
              </View>
              <Text style={[Fonts.body, { color: colors.inkSoft }]}>
                Ready for a magical story?
              </Text>
            </Animated.View>

            {/* Mascot hero */}
            <Animated.View entering={FadeIn.delay(200).duration(600)} style={styles.mascotWrapper}>
              <Image
                source={require('../../assets/images/mascot-reading.png')}
                style={styles.mascot}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Continue Listening card */}
            {continuationStory ? (
              <Animated.View
                entering={FadeInDown.delay(250).duration(500)}
                style={[
                  styles.continueCard,
                  { backgroundColor: colors.surface, ...getCardShadow(isDark) },
                ]}
              >
                <Text style={[Fonts.bodyBold, { color: colors.ink, marginBottom: Spacing.sm }]}>
                  Continue Listening
                </Text>
                <View style={styles.continueRow}>
                  <LinearGradient
                    colors={[colors.cardLavender, colors.cardLavenderDeep]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.continueThumbnail}
                  />
                  <View style={styles.continueMeta}>
                    <Text style={[Fonts.bodyBold, { color: colors.ink }]} numberOfLines={1}>
                      {continuationStory.title}
                    </Text>
                    <View style={[styles.progressTrack, { backgroundColor: colors.primarySoft }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.round(progressRatio * 100)}%` as `${number}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                    {timeRemaining ? (
                      <Text style={[Fonts.caption, { color: colors.inkMute }]}>
                        {timeRemaining}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    style={[styles.continuePlayBtn, { backgroundColor: colors.primary }]}
                    onPress={() => playStory(continuationStory)}
                    accessibilityRole="button"
                    accessibilityLabel="Play story"
                  >
                    <Ionicons name="play" size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
              </Animated.View>
            ) : null}

            {/* Inline CTA */}
            <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.inlineCta}>
              {ctaButton}
            </Animated.View>

            {/* Library header */}
            <Animated.View
              entering={FadeInDown.delay(400).duration(500)}
              style={styles.libraryHeader}
            >
              <Text style={[Fonts.bodyBold, { color: colors.ink }]}>Your Library</Text>
              <Text style={[Fonts.caption, { color: colors.primary }]}>
                {savedStories.length > 0
                  ? `${savedStories.length} ${savedStories.length === 1 ? 'story' : 'stories'}`
                  : 'See all'}
              </Text>
            </Animated.View>

            {/* Empty state */}
            {savedStories.length === 0 ? (
              <View style={styles.emptyState}>
                <Image
                  source={require('../../assets/images/mascot-resting.png')}
                  style={styles.emptyMascot}
                  resizeMode="contain"
                />
                <Text style={[Fonts.serifItalic, { color: colors.inkMute, textAlign: 'center' }]}>
                  No stories yet
                </Text>
                <Text
                  style={[
                    Fonts.caption,
                    { color: colors.inkMute, textAlign: 'center', marginTop: 4 },
                  ]}
                >
                  Your first adventure is one tap away
                </Text>
              </View>
            ) : null}
          </View>
        }
      />

      {/* Sticky CTA bar */}
      {showSticky ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.stickyBar}>
          <LinearGradient
            colors={['transparent', colors.background]}
            style={styles.stickyFade}
            pointerEvents="none"
          />
          <View style={[styles.stickyContent, { backgroundColor: colors.background }]}>
            {ctaButton}
          </View>
        </Animated.View>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Sizing.buttonHeight + Spacing.xxl + TAB_BAR_HEIGHT,
  },
  separator: {
    height: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  wordmarkBox: {
    width: 36,
    height: 36,
    borderRadius: Radii.small,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkLetter: {
    fontFamily: 'Fraunces_500Medium_Italic',
    fontSize: 18,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    paddingTop: Spacing.md,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  childName: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 38,
    letterSpacing: -0.8,
  },
  starGlyph: {
    fontSize: 28,
  },
  mascotWrapper: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  mascot: {
    width: SCREEN_WIDTH * 0.72,
    aspectRatio: 1,
  },
  continueCard: {
    borderRadius: Radii.cardLarge,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  continueThumbnail: {
    width: 72,
    height: 72,
    borderRadius: Radii.card,
  },
  continueMeta: {
    flex: 1,
    gap: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  continuePlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCta: {
    marginBottom: Spacing.lg,
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
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyMascot: {
    width: SCREEN_WIDTH * 0.5,
    aspectRatio: 1,
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
})
