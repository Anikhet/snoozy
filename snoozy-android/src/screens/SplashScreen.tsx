import React, { useEffect, useRef } from 'react'
import { Dimensions, Image, ImageBackground, StyleSheet, Text, View } from 'react-native'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Spacing } from '@/config/tokens'

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
  const floatY = useSharedValue(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!called.current) {
        called.current = true
        onFinish()
      }
    }, SPLASH_DURATION_MS)
    return () => clearTimeout(timer)
  }, [onFinish])

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

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../assets/images/bg-loading.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Brand header */}
        <Animated.View
          entering={FadeInDown.duration(600)}
          style={styles.header}
        >
          <Text style={styles.brandTitle}>Snoozy</Text>
          <Text style={styles.brandSubtitle}>Bedtime stories, made magical</Text>
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

        {/* Loading dots */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(500)}
          style={styles.dotsRow}
        >
          <LoadingDot delay={0} />
          <LoadingDot delay={200} />
          <LoadingDot delay={400} />
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E8E2F8',
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
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7B5BD6',
  },
})
