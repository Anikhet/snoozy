import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Fonts, Spacing, ThemeColors } from '@/config/tokens'
import { SnoozyButton } from '@/components/SnoozyButton'
import { ProgressDots } from '@/components/ProgressDots'
import { SnoozyStar } from '@/components/SnoozyStar'

const SPLASH_STARS = [
  { x: 48, y: 120, size: 8, opacity: 0.5 },
  { x: 90, y: 200, size: 6, opacity: 0.35 },
  { x: 310, y: 150, size: 8, opacity: 0.5 },
  { x: 280, y: 240, size: 6, opacity: 0.4 },
  { x: 60, y: 300, size: 6, opacity: 0.35 },
  { x: 330, y: 80, size: 6, opacity: 0.4 },
  { x: 180, y: 90, size: 8, opacity: 0.55 },
]

interface SplashProps {
  colors: ThemeColors
  onNext: () => void
  onSignIn: () => void
}

export function OnboardingSplash({ colors, onNext, onSignIn }: SplashProps) {
  return (
    <LinearGradient
      colors={[colors.primarySoft, colors.background, colors.backgroundDeep]}
      style={styles.fullScreen}
    >
      {SPLASH_STARS.map((star, i) => (
        <View key={i} style={[styles.starAbsolute, { left: star.x, top: star.y }]}>
          <SnoozyStar size={star.size} color={colors.primary} opacity={star.opacity} />
        </View>
      ))}

      <View style={styles.content}>
        <Text style={[styles.wordmark, { color: colors.ink }]}>snoozy</Text>

        {/* Hero orb */}
        <View style={styles.orbContainer}>
          <View style={[styles.orbOuter, { borderColor: `${colors.primary}14` }]} />
          <View style={[styles.orbMiddle, { borderColor: `${colors.primary}2E` }]} />
          <LinearGradient
            colors={['#FFFFFF', '#F0EBFF', colors.primary]}
            start={{ x: 0.35, y: 0.35 }}
            end={{ x: 0.8, y: 0.8 }}
            style={styles.orbInner}
          />
        </View>

        <View style={styles.headlineBlock}>
          <Text style={[styles.headline, { color: colors.ink }]}>A quiet place</Text>
          <Text style={[styles.headlineItalic, { color: colors.primary }]}>for bedtime stories.</Text>
        </View>

        <Text style={[Fonts.body, { color: colors.inkSoft, textAlign: 'center' }]}>
          Personalized narration. A built-in sleep timer. No screens needed once it starts.
        </Text>
      </View>

      <View style={styles.bottom}>
        <SnoozyButton title="Begin" onPress={onNext} />
        <ProgressDots currentStep={0} />
        <Pressable onPress={onSignIn} style={styles.signInLink}>
          <Text style={[styles.signInText, { color: colors.inkMute }]}>
            I already have an account{' \u00B7 '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign in</Text>
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  wordmark: { fontSize: 22, fontFamily: 'PlayfairDisplay_500Medium_Italic' },
  orbContainer: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbOuter: {
    position: 'absolute',
    width: 260, height: 260, borderRadius: 130, borderWidth: 1,
  },
  orbMiddle: {
    position: 'absolute',
    width: 212, height: 212, borderRadius: 106, borderWidth: 1,
  },
  orbInner: {
    width: 168, height: 168, borderRadius: 84,
    shadowColor: '#5B5BD6', shadowOpacity: 0.35, shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 }, elevation: 12,
  },
  headlineBlock: { alignItems: 'center' },
  headline: { fontSize: 34, fontFamily: 'PlayfairDisplay_400Regular', letterSpacing: -0.6 },
  headlineItalic: { fontSize: 34, fontFamily: 'PlayfairDisplay_400Regular_Italic', letterSpacing: -0.6 },
  bottom: {
    paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl,
    gap: Spacing.lg, alignItems: 'center',
  },
  signInLink: { marginTop: Spacing.sm },
  signInText: { fontSize: 12, fontFamily: 'Nunito_400Regular' },
  starAbsolute: { position: 'absolute' },
})
