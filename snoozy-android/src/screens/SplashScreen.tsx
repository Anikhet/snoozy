import React, { useEffect, useRef } from 'react'
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Fonts, Spacing } from '@/config/tokens'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SPLASH_DURATION_MS = 2500

interface Props {
  onFinish: () => void
}

function LoadingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3)

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
        false,
      ),
    )
  }, [])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return <Animated.View style={[styles.dot, style]} />
}

export function SplashScreen({ onFinish }: Props) {
  const called = useRef(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!called.current) {
        called.current = true
        onFinish()
      }
    }, SPLASH_DURATION_MS)
    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <LinearGradient
        colors={['#E8E5FF', '#F0EBFF', '#FBF5EC']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        {/* Mascot */}
        <Animated.View entering={FadeInDown.delay(100).duration(700)} style={styles.mascotWrapper}>
          <Image
            source={require('../../assets/images/mascot-reading.png')}
            style={styles.mascot}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App name */}
        <Animated.View entering={FadeInUp.delay(300).duration(600)} style={styles.nameRow}>
          <Text style={styles.sparkle}>✦</Text>
          <Text style={styles.appName}>Snoozy</Text>
          <Text style={[styles.sparkle, styles.sparkleSmall]}>✦</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text
          entering={FadeIn.delay(500).duration(600)}
          style={styles.tagline}
        >
          Bedtime stories, made magical
        </Animated.Text>
      </View>

      {/* Loading dots */}
      <Animated.View
        entering={FadeIn.delay(800).duration(400)}
        style={styles.dotsRow}
      >
        <LoadingDot delay={0} />
        <LoadingDot delay={200} />
        <LoadingDot delay={400} />
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F0EBFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  mascotWrapper: {
    marginBottom: Spacing.md,
  },
  mascot: {
    width: SCREEN_WIDTH * 0.6,
    aspectRatio: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sparkle: {
    fontSize: 22,
    color: '#7B5EA7',
  },
  sparkleSmall: {
    fontSize: 14,
    opacity: 0.6,
  },
  appName: {
    fontFamily: 'Fraunces_500Medium_Italic',
    fontSize: 44,
    color: '#2B2130',
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: '#6E5F69',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: Spacing.xl,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7B5EA7',
  },
})
