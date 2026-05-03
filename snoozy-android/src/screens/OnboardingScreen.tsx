import React, { useState } from 'react'
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Radii, Sizing, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'

export const ONBOARDING_KEY = 'snoozy_onboarding_complete'
export const ONBOARDING_NAME_KEY = 'snoozy_onboarding_name'
export const ONBOARDING_AGE_KEY = 'snoozy_onboarding_age'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const AGES = [2, 3, 4, 5, 6, 7, 8, 9, 10]

export function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const { colors } = useThemeColors()
  const [name, setName] = useState('')
  const [age, setAge] = useState(5)
  const [saving, setSaving] = useState(false)

  const isValid = name.trim().length > 0

  async function handleStart() {
    if (!isValid || saving) return
    setSaving(true)
    const trimmed = name.trim()
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    await AsyncStorage.setItem(ONBOARDING_NAME_KEY, trimmed)
    await AsyncStorage.setItem(ONBOARDING_AGE_KEY, String(age))
    useStoryStore.getState().setOnboardingDefaults({ name: trimmed, age })
    setSaving(false)
    onFinish()
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={[colors.primarySoft, colors.background]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mascot */}
          <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.mascotWrapper}>
            <Image
              source={require('../../assets/images/mascot-peeking.png')}
              style={styles.mascot}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Headline */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.headline}>
            <Text style={[Fonts.serifTitle, { color: colors.ink }]}>Who are we</Text>
            <Text
              style={{
                fontFamily: 'Nunito_700Bold',
                fontSize: 30,
                color: colors.primary,
                letterSpacing: -0.6,
              }}
            >
              tucking in tonight?
            </Text>
            <Text style={[Fonts.body, { color: colors.inkSoft, marginTop: Spacing.sm }]}>
              We'll personalise every story just for them.
            </Text>
          </Animated.View>

          {/* Name field */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.fieldSection}>
            <Text style={[Fonts.eyebrow, { color: colors.inkMute, marginBottom: Spacing.sm }]}>
              THEIR NAME
            </Text>
            <View
              style={[
                styles.nameField,
                {
                  backgroundColor: colors.surface,
                  borderColor: name.trim() ? colors.primary : colors.hair,
                },
              ]}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Ava"
                placeholderTextColor={colors.inkMute as string}
                style={[styles.nameInput, { color: colors.ink }]}
                maxLength={50}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>
          </Animated.View>

          {/* Age selection */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.fieldSection}>
            <Text style={[Fonts.eyebrow, { color: colors.inkMute, marginBottom: Spacing.sm }]}>
              HOW OLD?
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ageRow}
            >
              {AGES.map((a) => {
                const selected = age === a
                return (
                  <Pressable
                    key={a}
                    onPress={() => setAge(a)}
                    style={[
                      styles.agePill,
                      {
                        backgroundColor: selected ? colors.primary : colors.surface,
                        borderColor: selected ? colors.primary : colors.hair,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Age ${a}`}
                  >
                    <Text
                      style={[
                        Fonts.bodyBold,
                        { color: selected ? '#FFFFFF' : colors.inkSoft, fontSize: 16 },
                      ]}
                    >
                      {a}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </Animated.View>

          {/* Privacy note */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(500)}
            style={[styles.privacyNote, { backgroundColor: colors.primarySoft }]}
          >
            <Text style={{ fontSize: 14, color: colors.primary }}>☽</Text>
            <Text style={[Fonts.caption, { color: colors.primaryInk, flex: 1 }]}>
              Names make stories magical — they never leave your device.
            </Text>
          </Animated.View>

          <View style={styles.spacer} />

          {/* CTA */}
          <Animated.View
            entering={FadeInDown.delay(600).duration(500)}
            style={styles.ctaWrapper}
            shouldRasterizeIOS
            renderToHardwareTextureAndroid
          >
            <Pressable
              onPress={handleStart}
              disabled={!isValid || saving}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isValid }}
              android_ripple={{ color: 'transparent' }}
              style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
            >
              <LinearGradient
                colors={isValid ? [colors.primary, '#9B8EC4'] : [colors.hair, colors.hair]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.ctaButton,
                ]}
              >
                <Text
                  style={[
                    Fonts.buttonLabel,
                    { color: isValid ? '#FFFFFF' : (colors.inkMute as string) },
                  ]}
                >
                  {saving ? 'Just a moment…' : '✦  Let\'s create magic'}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  mascotWrapper: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  mascot: {
    width: SCREEN_WIDTH * 0.36,
    height: SCREEN_WIDTH * 0.36,
  },
  headline: {
    marginBottom: Spacing.lg,
  },
  fieldSection: {
    marginBottom: Spacing.lg,
  },
  nameField: {
    borderWidth: 1.5,
    borderRadius: Radii.field,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  nameInput: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 28,
    letterSpacing: -0.4,
    padding: 0,
  },
  ageRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  agePill: {
    width: 52,
    height: 52,
    borderRadius: Radii.field,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.card,
    marginBottom: Spacing.md,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.lg,
  },
  ctaWrapper: {
    marginTop: Spacing.md,
  },
  ctaButton: {
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
