import React, { useEffect, useRef, useState } from 'react'
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
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Radii, Spacing } from '@/config/tokens'
import { useBackHandler } from '@/hooks/useBackHandler'
import { useStoryStore } from '@/stores/storyStore'
import { StoryCoverTile } from '@/components/StoryCoverTile'
import { SnoozyButton } from '@/components/SnoozyButton'
import { WORLDS } from '@/config/storyOptions'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const colors = Colors.light

const RATING_LABELS: Record<number, string> = {
  1: "We'll do better next time 🌙",
  2: 'Glad you enjoyed it! ✨',
  3: 'Wonderful! Sweet dreams 🌟',
}

function StarRating({
  rating,
  onRate,
}: {
  rating: number | null
  onRate: (n: number) => void
}) {
  return (
    <View style={styles.ratingStars}>
      {[1, 2, 3].map((n) => {
        const filled = rating !== null && n <= rating
        return (
          <RatingStar key={n} index={n} filled={filled} onPress={() => onRate(n)} />
        )
      })}
    </View>
  )
}

function RatingStar({
  index,
  filled,
  onPress,
}: {
  index: number
  filled: boolean
  onPress: () => void
}) {
  const scale = useSharedValue(1)
  const prevFilled = useRef(false)

  useEffect(() => {
    if (filled && !prevFilled.current) {
      scale.value = withSpring(1.3, { damping: 8 }, () => {
        scale.value = withSpring(1)
      })
    }
    prevFilled.current = filled
  }, [filled])

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Rate ${index} star`}>
      <Animated.View style={style}>
        <Ionicons
          name="star"
          size={46}
          color={filled ? colors.starGold : colors.hair}
        />
      </Animated.View>
    </Pressable>
  )
}

export default function StoryEndScreen() {
  const currentStory = useStoryStore((s) => s.currentStory)
  const goHome = useStoryStore((s) => s.goHome)
  const navigateToWorldPicker = useStoryStore((s) => s.navigateToWorldPicker)
  const playStory = useStoryStore((s) => s.playStory)
  const rateStory = useStoryStore((s) => s.rateStory)
  const childDetails = useStoryStore((s) => s.childDetails)

  useBackHandler(goHome)

  const [rating, setRating] = useState<number | null>(null)
  const childName = childDetails.name || 'Dreamer'
  const floatY = useSharedValue(0)

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 3200 }),
        withTiming(0, { duration: 3200 }),
      ),
      -1,
      false,
    )
    return () => {
      floatY.value = 0
    }
  }, [])

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))

  function handleRate(n: number) {
    setRating(n)
    if (currentStory) rateStory(currentStory.id, n)
  }

  const worldName =
    WORLDS.find((w) => w.id === currentStory?.templateId)?.name ?? 'Story'

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      {/* Soft gradient background accent at top */}
      <View style={styles.bgAccent} pointerEvents="none">
        <LinearGradient
          colors={[colors.primarySoft, 'transparent']}
          locations={[0, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header: farewell text + mascot */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
          {/* Sparkle row */}
          <View style={styles.sparkleRow}>
            <Text style={[styles.sparkle, { color: colors.starGold }]}>✦</Text>
            <Text style={[styles.sparkle, { color: colors.starGold, fontSize: 8, opacity: 0.5 }]}>·</Text>
            <Text style={[styles.sparkle, { color: colors.starGold, fontSize: 8, opacity: 0.5 }]}>·</Text>
            <Text style={[styles.sparkle, { color: colors.starGold }]}>✦</Text>
          </View>

          <Text style={styles.farewellLabel}>Sweet dreams,</Text>
          <View style={styles.nameRow}>
            <Text style={styles.childName}>{childName}</Text>
            <Text style={[styles.nameStar, { color: colors.starGold }]}>✦</Text>
          </View>

          {/* Floating mascot */}
          <Animated.View entering={FadeIn.delay(300).duration(700)}>
            <Animated.View style={mascotStyle}>
              <Image
                source={require('../../assets/images/mascot-resting.png')}
                style={styles.mascot}
                resizeMode="contain"
              />
            </Animated.View>
          </Animated.View>
        </Animated.View>

        {/* Story recap card */}
        {currentStory ? (
          <Animated.View entering={FadeInUp.delay(350).duration(500)} style={styles.storyCard}>
            <StoryCoverTile
              title={currentStory.title}
              worldId={currentStory.templateId}
              size="sm"
              style={styles.storyCover}
            />
            <View style={styles.storyCardDivider} />
            <View style={styles.storyCardInfo}>
              <View style={styles.worldChip}>
                <Text style={styles.worldChipText}>{worldName}</Text>
              </View>
              <Text style={styles.storyCardTitle} numberOfLines={2}>
                {currentStory.title}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {/* Rating card */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.ratingCard}>
          <Text style={styles.ratingQuestion}>How was tonight's story?</Text>
          <StarRating rating={rating} onRate={handleRate} />
          {rating !== null ? (
            <Animated.Text
              entering={FadeIn.duration(300)}
              style={styles.ratingFeedback}
            >
              {RATING_LABELS[rating]}
            </Animated.Text>
          ) : null}
        </Animated.View>

        {/* Action buttons */}
        <Animated.View
          entering={FadeInUp.delay(650).duration(500)}
          style={styles.actions}
          shouldRasterizeIOS
          renderToHardwareTextureAndroid
        >
          <SnoozyButton
            style="indigo"
            title="✦  New Story"
            onPress={navigateToWorldPicker}
          />
          <SnoozyButton
            style="subtle"
            title="Play Again"
            icon="refresh"
            onPress={() => currentStory && playStory(currentStory)}
          />
          <Pressable onPress={goHome} accessibilityRole="button" style={styles.tertiaryBtn}>
            <Text style={styles.tertiaryLabel}>Back to Library</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgAccent: {
    position: 'absolute',
    top: 0,
    left: -SCREEN_WIDTH * 0.15,
    width: SCREEN_WIDTH * 1.3,
    height: SCREEN_WIDTH * 1.1,
    borderRadius: SCREEN_WIDTH * 0.55,
    overflow: 'hidden',
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  sparkle: {
    fontSize: 14,
  },
  farewellLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 20,
    color: colors.inkSoft,
    marginBottom: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  childName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 36,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  nameStar: {
    fontSize: 22,
  },
  mascot: {
    width: SCREEN_WIDTH * 0.36,
    height: SCREEN_WIDTH * 0.36,
  },
  storyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: Radii.cardLarge,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  storyCover: {
    width: 72,
    height: 72,
    borderRadius: Radii.small,
  },
  storyCardDivider: {
    width: 1,
    height: 44,
    backgroundColor: colors.hair,
  },
  storyCardInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  worldChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 50,
    backgroundColor: colors.primarySoft,
  },
  worldChipText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  storyCardTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  ratingCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: Radii.cardLarge,
    borderWidth: 1,
    borderColor: colors.hair,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  ratingQuestion: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
  },
  ratingStars: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  ratingFeedback: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.inkMute as string,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.sm,
  },
  tertiaryBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  tertiaryLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.inkMute as string,
    textDecorationLine: 'underline',
  },
})
