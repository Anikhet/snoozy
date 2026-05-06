import React, { useEffect, useRef, useState } from 'react'
import {
  Dimensions,
  Image,
  Pressable,
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
import { Colors, Fonts, Radii, Sizing, Spacing } from '@/config/tokens'
import { useBackHandler } from '@/hooks/useBackHandler'
import { useStoryStore } from '@/stores/storyStore'
import { StoryCoverTile } from '@/components/StoryCoverTile'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Always use light colors — warm return from the dark player
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
          size={42}
          color={filled ? '#F5C842' : colors.hair}
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
        withTiming(-8, { duration: 3000 }),
        withTiming(0, { duration: 3000 }),
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

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={styles.inner}>
        {/* TOP — farewell + mascot */}
        <View style={styles.topSection}>
          {/* Sparkle header */}
          <Animated.View
            entering={FadeIn.duration(600)}
            style={styles.sparkleRow}
          >
            <Text style={[styles.sparkle, { color: colors.starGold }]}>✦</Text>
            <Text style={[styles.sparkle, { color: colors.starGold, fontSize: 10, opacity: 0.6 }]}>·</Text>
            <Text style={[styles.sparkle, { color: colors.starGold, fontSize: 10, opacity: 0.6 }]}>·</Text>
            <Text style={[styles.sparkle, { color: colors.starGold }]}>✦</Text>
          </Animated.View>

          {/* Farewell text */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(600)}
            style={styles.farewellBlock}
          >
            <Text style={[Fonts.serifItalic, { color: colors.inkSoft, textAlign: 'center' }]}>
              Sweet dreams,
            </Text>
            <View style={styles.nameRow}>
              <Text style={[styles.childName, { color: colors.ink }]}>{childName}</Text>
              <Text style={[styles.nameStar, { color: colors.starGold }]}>✦</Text>
            </View>
          </Animated.View>

          {/* Mascot */}
          <Animated.View entering={FadeIn.delay(300).duration(700)}>
            <Animated.View style={mascotStyle}>
              <Image
                source={require('../../assets/images/mascot-resting.png')}
                style={styles.mascot}
                resizeMode="contain"
              />
            </Animated.View>
          </Animated.View>

          {/* Story title recap */}
          {currentStory ? (
            <Animated.View entering={FadeInUp.delay(450).duration(500)}>
              <StoryCoverTile
                title={currentStory.title}
                worldId={currentStory.templateId}
                size="md"
                style={{ width: 160, height: 160 }}
              />
            </Animated.View>
          ) : null}
        </View>

        {/* MIDDLE — star rating */}
        <Animated.View
          entering={FadeInUp.delay(550).duration(500)}
          style={styles.ratingSection}
        >
          <Text style={[Fonts.bodyBold, { color: colors.ink, textAlign: 'center', marginBottom: Spacing.sm }]}>
            How was tonight's story?
          </Text>
          <StarRating rating={rating} onRate={handleRate} />
          {rating !== null ? (
            <Animated.Text
              entering={FadeIn.duration(300)}
              style={[Fonts.caption, { color: colors.inkMute, textAlign: 'center', marginTop: Spacing.sm }]}
            >
              {RATING_LABELS[rating]}
            </Animated.Text>
          ) : null}
        </Animated.View>

        {/* BOTTOM — action buttons */}
        <Animated.View
          entering={FadeInUp.delay(650).duration(500)}
          style={styles.actions}
          shouldRasterizeIOS
          renderToHardwareTextureAndroid
        >
          {/* Primary: New Story */}
          <Pressable
            onPress={navigateToWorldPicker}
            accessibilityRole="button"
            android_ripple={{ color: 'transparent' }}
            style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
          >
            <LinearGradient
              colors={[colors.primary, '#9B8EC4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Text style={[Fonts.buttonLabel, styles.primaryBtnLabel]}>✦  New Story</Text>
            </LinearGradient>
          </Pressable>

          {/* Secondary: Play Again */}
          <Pressable
            style={[
              styles.secondaryBtn,
              { backgroundColor: colors.surface, borderColor: colors.hair },
            ]}
            onPress={() => currentStory && playStory(currentStory)}
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={16} color={colors.inkMute as string} />
            <Text style={[Fonts.buttonLabel, { color: colors.ink }]}>Play Again</Text>
          </Pressable>

          {/* Tertiary: Back to Library */}
          <Pressable onPress={goHome} accessibilityRole="button" style={styles.tertiaryBtn}>
            <Text style={[Fonts.body, styles.tertiaryLabel, { color: colors.inkMute as string }]}>
              Back to Library
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  sparkle: {
    fontSize: 14,
  },
  farewellBlock: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  childName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 38,
    letterSpacing: -0.8,
  },
  nameStar: {
    fontSize: 24,
  },
  mascot: {
    width: SCREEN_WIDTH * 0.38,
    height: SCREEN_WIDTH * 0.38,
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 20,
  },
  actions: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  primaryBtn: {
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnLabel: {
    color: '#FFFFFF',
  },
  secondaryBtn: {
    height: 52,
    borderRadius: Radii.button,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  tertiaryBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  tertiaryLabel: {
    textDecorationLine: 'underline',
  },
})
