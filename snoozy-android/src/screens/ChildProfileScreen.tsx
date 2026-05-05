import React, { useState } from 'react'
import {
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Radii, Sizing, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { Pronouns } from '@/types/story'
import { useEffect } from 'react'

export const CHILD_PROFILE_KEY = 'snoozy_child_profile'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const MIN_AGE = 2
const MAX_AGE = 12

const PRONOUN_OPTIONS: { label: string; value: Pronouns }[] = [
  { label: 'He/him', value: 'he/him' },
  { label: 'She/her', value: 'she/her' },
  { label: 'They/them', value: 'they/them' },
]

interface Props {
  onFinish: () => void
}

export function ChildProfileScreen({ onFinish }: Props) {
  const setOnboardingDefaults = useStoryStore((s) => s.setOnboardingDefaults)
  const existing = useStoryStore((s) => s.onboardingDefaults)

  const [name, setName] = useState(existing?.name ?? '')
  const [age, setAge] = useState(existing?.age ?? 5)
  const [pronouns, setPronouns] = useState<Pronouns | null>(existing?.pronouns ?? null)
  const [nameFocused, setNameFocused] = useState(false)
  const [saving, setSaving] = useState(false)

  const canProceed = name.trim().length > 0 && pronouns !== null

  const floatY = useSharedValue(0)
  const mascotStyle = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }))

  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(-8, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
  }, [])

  const handleStart = async () => {
    if (!canProceed || saving) return
    setSaving(true)
    const trimmed = name.trim()
    const profile = { name: trimmed, age, pronouns: pronouns! }
    await AsyncStorage.setItem(CHILD_PROFILE_KEY, JSON.stringify(profile))
    setOnboardingDefaults(profile)
    setSaving(false)
    onFinish()
  }

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../assets/images/bg-loading.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {/* Soft overlay so text stays readable */}
      <LinearGradient
        colors={['rgba(232,226,248,0.55)', 'rgba(248,244,255,0.75)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Mascot */}
            <Animated.View
              entering={FadeIn.delay(100).duration(700)}
              style={[styles.mascotWrapper, mascotStyle]}
            >
              <Animated.Image
                source={require('../../assets/images/mascot-happy.png')}
                style={styles.mascot}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Hero text */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.heroBlock}>
              <Text style={styles.heroTitle}>
                {'Now, tell us about\nyour little one '}
                <Text style={styles.heroStar}>★</Text>
              </Text>
              <Text style={styles.heroSub}>
                We'll use this to personalise every story
              </Text>
            </Animated.View>

            {/* Card */}
            <Animated.View
              entering={FadeInUp.delay(300).duration(500)}
              style={styles.card}
            >
              {/* Name */}
              <Text style={styles.fieldLabel}>Child's name</Text>
              <View
                style={[
                  styles.nameRow,
                  { borderColor: nameFocused ? '#5B5BD6' : 'rgba(91,91,214,0.18)' },
                ]}
              >
                <Ionicons name="person-outline" size={18} color="#9B8EC4" />
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  placeholder="Enter their first name"
                  placeholderTextColor="#B0A5CC"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  maxLength={30}
                />
              </View>

              <View style={styles.divider} />

              {/* Age stepper */}
              <Text style={styles.fieldLabel}>Age</Text>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => setAge((a) => Math.max(MIN_AGE, a - 1))}
                  style={styles.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease age"
                >
                  <Ionicons name="remove" size={22} color="#5B5BD6" />
                </Pressable>
                <Text style={styles.stepAge}>{age}</Text>
                <Pressable
                  onPress={() => setAge((a) => Math.min(MAX_AGE, a + 1))}
                  style={styles.stepBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Increase age"
                >
                  <Ionicons name="add" size={22} color="#5B5BD6" />
                </Pressable>
              </View>
              <Text style={styles.ageHint}>Stories are tailored to this age</Text>

              <View style={styles.divider} />

              {/* Pronouns */}
              <Text style={styles.fieldLabel}>Pronouns</Text>
              <View style={styles.pronounRow}>
                {PRONOUN_OPTIONS.map((opt) => {
                  const selected = pronouns === opt.value
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setPronouns(opt.value)}
                      style={[
                        styles.pronounPill,
                        selected && styles.pronounPillSelected,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.pronounLabel,
                          selected && styles.pronounLabelSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </Animated.View>

            <View style={styles.ctaSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Sticky CTA */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(500)}
          style={styles.ctaBar}
        >
          <Pressable
            onPress={handleStart}
            disabled={!canProceed || saving}
            android_ripple={{ color: 'transparent' }}
            shouldRasterizeIOS
            renderToHardwareTextureAndroid
            style={({ pressed }) => ({
              opacity: pressed ? 0.82 : canProceed ? 1 : 0.45,
              borderRadius: Radii.button,
            })}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#5B5BD6', '#9B8EC4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaLabel}>
                {saving ? 'Just a moment…' : "Let's start  →"}
              </Text>
            </LinearGradient>
          </Pressable>
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
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Sizing.buttonHeight + Spacing.xxl,
  },
  mascotWrapper: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  mascot: {
    width: SCREEN_WIDTH * 0.46,
    height: SCREEN_WIDTH * 0.46,
  },
  heroBlock: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  heroTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    color: '#2D1F6E',
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 36,
  },
  heroStar: {
    color: '#F5C842',
    fontSize: 26,
  },
  heroSub: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: '#7B6B9E',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.cardLarge,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  fieldLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: '#2D1F6E',
    marginBottom: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: Radii.field,
    paddingHorizontal: Spacing.md,
    height: 52,
    backgroundColor: '#F7F5FF',
  },
  nameInput: {
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: '#2D1F6E',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(91,91,214,0.1)',
    marginVertical: Spacing.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(91,91,214,0.18)',
    borderRadius: Radii.field,
    overflow: 'hidden',
    backgroundColor: '#F7F5FF',
  },
  stepBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  stepAge: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 28,
    color: '#2D1F6E',
    minWidth: 48,
    textAlign: 'center',
  },
  ageHint: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: '#9B8EC4',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  pronounRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pronounPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radii.button,
    borderWidth: 1.5,
    borderColor: 'rgba(91,91,214,0.25)',
    backgroundColor: '#F7F5FF',
  },
  pronounPillSelected: {
    backgroundColor: '#5B5BD6',
    borderColor: '#5B5BD6',
  },
  pronounLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: '#5B5BD6',
  },
  pronounLabelSelected: {
    color: '#FFFFFF',
  },
  ctaSpacer: {
    height: Sizing.buttonHeight + Spacing.xxl,
  },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  ctaGradient: {
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
})
