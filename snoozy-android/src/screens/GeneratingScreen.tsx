import React, { useEffect, useRef, useState } from 'react'
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Night } from '@/config/tokens'
import { Fonts, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { StoryStatus } from '@/types/story'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const MIDNIGHT = '#0F0A2E'

const LOADING_LINES = [
  (name: string) => `Sprinkling stardust for ${name}…`,
  () => 'Waking up the story fairies…',
  (name: string) => `Writing ${name}'s name in the stars…`,
  () => 'The adventure is almost ready…',
  () => 'Whispering magic into every word…',
  (name: string) => `Painting the world just for ${name}…`,
]

// Deterministic star positions — no randomness at render time
const STARS = Array.from({ length: 20 }, (_, i) => ({
  x: ((i * 53 + 17) % (SCREEN_WIDTH - 8)),
  y: ((i * 79 + 31) % (SCREEN_HEIGHT - 8)),
  size: 2 + (i % 3),
  color: i % 3 === 0 ? '#F5C842' : i % 3 === 1 ? '#C4B5FD' : '#FFFFFF',
  opacity: 0.6 + (i % 3) * 0.1,
  delay: i * 180,
}))

// Star fill timing in ms from screen mount
const STAR_FILL_TIMES = [0, 3000, 7000, 12000, -1] // -1 = fills on ready

function StarParticle({ star }: { star: (typeof STARS)[number] }) {
  const opacity = useSharedValue(star.opacity)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.1, { duration: 1200 + star.delay }),
        withTiming(star.opacity, { duration: 1200 }),
      ),
      -1,
      false,
    )
  }, [])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        styles.starParticle,
        {
          left: star.x,
          top: star.y,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
          backgroundColor: star.color,
        },
        style,
      ]}
    />
  )
}

function ProgressStar({
  filled,
  index,
}: {
  filled: boolean
  index: number
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
    <Animated.View style={style}>
      <Ionicons
        name={filled ? 'star' : 'star-outline'}
        size={22}
        color={filled ? '#F5C842' : 'rgba(255,255,255,0.2)'}
      />
    </Animated.View>
  )
}

export default function GeneratingScreen() {
  const savedStories = useStoryStore((s) => s.savedStories)
  const generatingStoryId = useStoryStore((s) => s.generatingStoryId)
  const playStory = useStoryStore((s) => s.playStory)
  const goHome = useStoryStore((s) => s.goHome)
  const childDetails = useStoryStore((s) => s.childDetails)
  const selectedWorldId = useStoryStore((s) => s.selectedWorldId)

  const childName = childDetails.name || 'your dreamer'
  const worldLabel = selectedWorldId
    ? WORLD_LABELS[selectedWorldId] ?? selectedWorldId
    : null

  const [lineIndex, setLineIndex] = useState(0)
  const [lineText, setLineText] = useState(LOADING_LINES[0](childName))
  const [isError, setIsError] = useState(false)
  const [filledStars, setFilledStars] = useState(1) // first star fills immediately

  const textOpacity = useSharedValue(1)
  const flashOpacity = useSharedValue(0)
  const floatY = useSharedValue(0)

  // Mascot float animation
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2200 }),
        withTiming(0, { duration: 2200 }),
      ),
      -1,
      false,
    )
  }, [])

  // Rotate loading copy every 2.8s
  useEffect(() => {
    const interval = setInterval(() => {
      textOpacity.value = withTiming(0, { duration: 400 }, () => {
        setLineIndex((prev) => {
          const next = (prev + 1) % LOADING_LINES.length
          setLineText(LOADING_LINES[next](childName))
          return next
        })
        textOpacity.value = withTiming(1, { duration: 400 })
      })
    }, 2800)
    return () => clearInterval(interval)
  }, [childName])

  // Progressive star fill
  useEffect(() => {
    const timers = [
      setTimeout(() => setFilledStars(2), STAR_FILL_TIMES[1]),
      setTimeout(() => setFilledStars(3), STAR_FILL_TIMES[2]),
      setTimeout(() => setFilledStars(4), STAR_FILL_TIMES[3]),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  // Watch for generation completion or failure
  useEffect(() => {
    if (!generatingStoryId) return
    const story = savedStories.find((s) => s.id === generatingStoryId)
    if (!story) return

    if (story.status === StoryStatus.Ready) {
      setFilledStars(5)
      const timer = setTimeout(() => {
        // Brief white flash then navigate to player
        flashOpacity.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0, { duration: 200 }),
        )
        setTimeout(() => playStory(story), 400)
      }, 600)
      return () => clearTimeout(timer)
    }

    if (story.status === StoryStatus.Failed) {
      setIsError(true)
    }
  }, [savedStories, generatingStoryId])

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))

  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }))
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }))

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      {/* Background */}
      <View style={styles.bg} pointerEvents="none">
        <LinearGradient
          colors={['#1A0F4E', MIDNIGHT]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {STARS.map((star, i) => (
          <StarParticle key={i} star={star} />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Mascot + glow halo */}
        <View style={styles.mascotContainer}>
          <LinearGradient
            colors={['#5B3DA8AA', '#5B3DA800']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.halo}
          />
          <Animated.View entering={FadeIn.duration(800)} style={mascotStyle}>
            <Image
              source={require('../../assets/images/mascot-reading.png')}
              style={styles.mascot}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* World context pill */}
        {worldLabel ? (
          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            style={styles.worldPill}
          >
            <Text style={styles.worldPillText}>{worldLabel}</Text>
          </Animated.View>
        ) : null}

        {/* Loading copy */}
        <View style={styles.copyBlock}>
          {isError ? (
            <Text style={[Fonts.serifItalic, styles.loadingText]}>
              Something went wrong — let's try again
            </Text>
          ) : (
            <Animated.Text style={[Fonts.serifItalic, styles.loadingText, textStyle]}>
              {lineText}
            </Animated.Text>
          )}
          {!isError ? (
            <Text style={styles.subText}>This usually takes about 15 seconds</Text>
          ) : null}

          {isError ? (
            <Animated.View entering={FadeIn.delay(200).duration(400)}>
              <Text
                style={styles.retryBtn}
                onPress={goHome}
                accessibilityRole="button"
              >
                Try Again
              </Text>
            </Animated.View>
          ) : null}
        </View>

        {/* Progress stars */}
        <View style={styles.starsRow}>
          {Array.from({ length: 5 }, (_, i) => (
            <ProgressStar key={i} filled={i < filledStars} index={i} />
          ))}
        </View>
      </View>

      {/* Bottom wordmark */}
      <Text style={styles.wordmark}>SNOOZY</Text>

      {/* Flash overlay for transition */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.flashOverlay, flashStyle]}
        pointerEvents="none"
      />
    </SafeAreaView>
  )
}

const WORLD_LABELS: Record<string, string> = {
  kingdom: '🏰  Magical Kingdom',
  forest:  '🌲  Enchanted Forest',
  space:   '🚀  Outer Space',
  ocean:   '🐠  Ocean Deep',
  clouds:  '☁️  Cloud Kingdom',
  jungle:  '🦁  Magical Safari',
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MIDNIGHT,
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
  },
  starParticle: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
  },
  mascot: {
    width: SCREEN_WIDTH * 0.38,
    height: SCREEN_WIDTH * 0.38,
  },
  worldPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: Spacing.lg,
  },
  worldPillText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  copyBlock: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  loadingText: {
    color: Night.ink,
    textAlign: 'center',
    fontSize: 22,
  },
  subText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  retryBtn: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: Night.ink,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 50,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.xl,
  },
  wordmark: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    paddingBottom: Spacing.md,
  },
  flashOverlay: {
    backgroundColor: '#FFFFFF',
  },
})
