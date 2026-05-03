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
import MaskedView from '@react-native-masked-view/masked-view'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColors } from '@/hooks/useThemeColors'
import {
  Fonts,
  Radii,
  Sizing,
  Spacing,
} from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { Story, StoryStatus } from '@/types/story'
import { StoryRow } from '@/components/StoryRow'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'
import { StoryCoverTile } from '@/components/StoryCoverTile'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

function getGreetingLead(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning,'
  if (hour >= 12 && hour < 17) return 'Good afternoon,'
  if (hour >= 17 && hour < 22) return 'Good evening,'
  return 'Sleepy time,'
}

export function HomeScreen() {
  const { colors } = useThemeColors()
  const savedStories = useStoryStore((s) => s.savedStories)
  const navigateToWorldPicker = useStoryStore((s) => s.navigateToWorldPicker)
  const navigateToLibrary = useStoryStore((s) => s.navigateToLibrary)
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
    <Pressable
      onPress={navigateToWorldPicker}
      accessibilityRole="button"
      android_ripple={{ color: 'transparent' }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.82 : 1,
        borderRadius: Radii.button,
      })}
    >
      <LinearGradient
        colors={[colors.primary, '#9B8EC4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.ctaGradient}
      >
        <Text style={[Fonts.buttonLabel, styles.ctaLabel]}>✦  Create a Story</Text>
      </LinearGradient>
    </Pressable>
  )

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Full-bleed background illustration — locked behind everything */}
      <ImageBackground
        source={require('../../assets/images/bg-home.png')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', `${colors.background}AA`, colors.background]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <FlatList
        data={savedStories.slice(0, 3)}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Greeting */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.greeting}>
              <MaskedView maskElement={<Text style={styles.greetingLead}>{getGreetingLead()}</Text>}>
                <LinearGradient colors={[colors.primary, '#9B8EC4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={[styles.greetingLead, { opacity: 0 }]}>{getGreetingLead()}</Text>
                </LinearGradient>
              </MaskedView>
              <View style={styles.nameRow}>
                <MaskedView maskElement={<Text style={styles.childName}>{childName}</Text>}>
                  <LinearGradient colors={[colors.primary, '#9B8EC4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={[styles.childName, { opacity: 0 }]}>{childName}</Text>
                  </LinearGradient>
                </MaskedView>
                <Text style={[styles.starGlyph, { color: colors.starGold }]}>✦</Text>
              </View>
              {/* <Text style={[styles.greetingSub, { color: colors.vibeSelected }]}>
                Ready for a magical story?
              </Text> */}
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
                  { backgroundColor: colors.surface },
                ]}
              >
                <Text style={[Fonts.bodyBold, { color: colors.ink, marginBottom: Spacing.sm }]}>
                  Continue Listening
                </Text>
                <View style={styles.continueRow}>
                  <StoryCoverTile
                    title={continuationStory.title}
                    worldId={continuationStory.templateId}
                    size="sm"
                    borderRadius={Radii.card}
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
                    style={({ pressed }) => [
                      styles.continuePlayBtn,
                      { backgroundColor: colors.primary },
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
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
            <Animated.View
              entering={FadeInDown.delay(500).duration(500)}
              style={styles.inlineCta}
              shouldRasterizeIOS
              renderToHardwareTextureAndroid
            >
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
        ListFooterComponent={
          savedStories.length > 3 ? (
            <Pressable
              onPress={navigateToLibrary}
              style={[styles.viewAllBtn, { borderColor: colors.hair }]}
              accessibilityRole="button"
              accessibilityLabel="View all stories"
            >
              <Text style={[Fonts.caption, { color: colors.primary }]}>View all stories</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </Pressable>
          ) : null
        }
      />

      {/* Sticky CTA bar */}
      {showSticky ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.stickyBar}
          shouldRasterizeIOS
          renderToHardwareTextureAndroid
        >
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
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Sizing.buttonHeight + Spacing.xxl + TAB_BAR_HEIGHT,
  },
  separator: {
    height: 10,
  },
  greeting: {
    paddingTop: Spacing.md,
    gap: 0,
  },
  greetingLead: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    letterSpacing: 0.1,
    color: '#000',
  },
  greetingSub: {
    fontFamily: 'Nunito_600SemiBold',
    paddingTop: 0,
    fontSize: 18,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  childName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 44,
    letterSpacing: -1,
    color: '#000',
  },
  starGlyph: {
    fontSize: 30,
  },
  mascotWrapper: {
    alignItems: 'center',
    marginTop: -70,
    marginBottom: -150,
    paddingHorizontal: Spacing.sm,
  },
  mascot: {
    width: SCREEN_WIDTH * 1.2,
    height: SCREEN_WIDTH * 1.2,
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
    width: SCREEN_WIDTH * 0.32,
    height: SCREEN_WIDTH * 0.32,
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
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    borderRadius: Radii.small,
    borderWidth: 1,
  },
})
