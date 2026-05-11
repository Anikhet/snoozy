import React, { useEffect, useRef, useState } from 'react'
import {
  Dimensions,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useBackHandler } from '@/hooks/useBackHandler'
import { Colors, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { StoryStatus } from '@/types/story'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const BAR_WIDTH = SCREEN_WIDTH - Spacing.xl * 2

// Phase 1: quick jump to 30% in 3s — shows immediate response
const PROGRESS_PHASE1_TARGET = BAR_WIDTH * 0.30
const PROGRESS_PHASE1_DURATION = 3000
// Phase 2: slow linear crawl from 30% → 85% over 45s — always visibly moving
const PROGRESS_PHASE2_TARGET = BAR_WIDTH * 0.85
const PROGRESS_PHASE2_DURATION = 45000

const LOADING_LINES = [
  (name: string) => `Crafting ${name}'s magical story…`,
  () => 'Adding a sprinkle of magic ✨',
  (name: string) => `Writing ${name}'s name in the stars…`,
  () => 'The adventure is almost ready…',
  () => 'Whispering magic into every word…',
  (name: string) => `Painting the world just for ${name}…`,
]

const SUB_LINES = [
  'Stories are better when dreams come to life…',
  'Usually takes about 20–30 seconds',
  'Good things take a little magic…',
  'Almost there, hold tight…',
]

export default function GeneratingScreen() {
  const { colors } = useThemeColors()
  const savedStories = useStoryStore((s) => s.savedStories)
  const generatingStoryId = useStoryStore((s) => s.generatingStoryId)
  const playStory = useStoryStore((s) => s.playStory)
  const goHome = useStoryStore((s) => s.goHome)
  const cancelGeneration = useStoryStore((s) => s.cancelGeneration)
  const childDetails = useStoryStore((s) => s.childDetails)

  useBackHandler(cancelGeneration)

  const childName = childDetails.name || 'your dreamer'

  const lineIndexRef = useRef(0)
  const [lineText, setLineText] = useState(LOADING_LINES[0](childName))
  const [subText, setSubText] = useState(SUB_LINES[0])
  const [isError, setIsError] = useState(false)

  const textOpacity = useSharedValue(1)
  const floatY = useSharedValue(0)
  const progressWidth = useSharedValue(0)
  const flashOpacity = useSharedValue(0)

  // Mascot gentle float
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
  }, [])

  // Progress bar: quick jump to 30%, then slow linear crawl to 85%
  useEffect(() => {
    progressWidth.value = withSequence(
      withTiming(PROGRESS_PHASE1_TARGET, {
        duration: PROGRESS_PHASE1_DURATION,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(PROGRESS_PHASE2_TARGET, {
        duration: PROGRESS_PHASE2_DURATION,
        easing: Easing.linear,
      }),
    )
  }, [])

  // Rotate loading copy every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      textOpacity.value = withTiming(0, { duration: 350 })
      setTimeout(() => {
        lineIndexRef.current = (lineIndexRef.current + 1) % LOADING_LINES.length
        setLineText(LOADING_LINES[lineIndexRef.current](childName))
        setSubText(SUB_LINES[lineIndexRef.current % SUB_LINES.length])
        textOpacity.value = withTiming(1, { duration: 350 })
      }, 350)
    }, 3000)
    return () => clearInterval(interval)
  }, [childName])

  // Watch for completion / failure
  useEffect(() => {
    if (!generatingStoryId) return
    const story = savedStories.find((s) => s.id === generatingStoryId)
    if (!story) return

    if (story.status === StoryStatus.Ready) {
      progressWidth.value = withSpring(BAR_WIDTH, { damping: 18, stiffness: 120 })
      const timer = setTimeout(() => {
        flashOpacity.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0, { duration: 200 }),
        )
        setTimeout(() => playStory(story), 400)
      }, 700)
      return () => clearTimeout(timer)
    }

    if (story.status === StoryStatus.Failed) {
      setIsError(true)
    }
  }, [savedStories, generatingStoryId])

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))

  const textAnimStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }))

  const progressStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
  }))

  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }))

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../assets/images/bg-loading.png')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', `${colors.background}22`, `${colors.background}99`]}
          locations={[0, 0, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Brand title */}
        <Animated.View
          entering={FadeInDown.duration(600)}
          style={styles.header}
        >
          <Text style={styles.brandTitle}>Snoozy</Text>
          <Text style={styles.brandSubtitle}>Crafting your magical story…</Text>
        </Animated.View>

        {/* Mascot */}
        <View style={styles.mascotWrapper}>
          <Animated.View entering={FadeIn.delay(200).duration(800)}>
            <Animated.View style={mascotStyle}>
              <Image
                source={require('../../assets/images/mascot-sleeping.png')}
                style={styles.mascot}
                resizeMode="contain"
              />
            </Animated.View>
          </Animated.View>
        </View>

        {/* Progress bar */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(600)}
          style={styles.barTrack}
        >
          <Animated.View style={[styles.barFill, progressStyle]}>
            {/* Glowing tip */}
            <View style={styles.barTip} />
          </Animated.View>
        </Animated.View>

        {/* Loading copy */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(600)}
          style={styles.copyBlock}
        >
          {isError ? (
            <>
              <Text style={styles.loadingText}>
                Something went wrong — let's try again
              </Text>
              <Pressable onPress={goHome} style={styles.retryBtn}>
                <Text style={styles.retryLabel}>Go Home</Text>
              </Pressable>
            </>
          ) : (
            <Animated.View style={[styles.copyInner, textAnimStyle]}>
              <Text style={styles.loadingText}>{lineText}</Text>
              <Text style={styles.subText}>{subText}</Text>
            </Animated.View>
          )}
        </Animated.View>
        {/* Cancel — only visible while generating, not on error */}
        {!isError && (
          <Pressable
            onPress={cancelGeneration}
            style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.5 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Cancel story generation"
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        )}
      </SafeAreaView>

      {/* Flash overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.flashOverlay, flashStyle]}
        pointerEvents="none"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    gap: 2,
  },
  brandTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 54,
    color: Colors.light.purpleDeep,
    letterSpacing: -1,
  },
  brandSubtitle: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 14,
    color: Colors.light.purpleSoft,
  },
  mascotWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40,
    marginBottom: -60,
  },
  mascot: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
  },
  barTrack: {
    width: BAR_WIDTH,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(93,62,180,0.15)',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  barFill: {
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#7B5BD6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTip: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F5C842',
    marginRight: -2,
  },
  copyBlock: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
    minHeight: 70,
    justifyContent: 'center',
  },
  copyInner: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  loadingText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    color: Colors.light.purpleDeep,
    textAlign: 'center',
  },
  subText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: Colors.light.purpleSoft,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: 'rgba(93,62,180,0.12)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 50,
    marginTop: Spacing.sm,
  },
  retryLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: Colors.light.purpleDeep,
  },
  flashOverlay: {
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cancelLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: Colors.light.purpleSoft,
    textAlign: 'center',
  },
})
