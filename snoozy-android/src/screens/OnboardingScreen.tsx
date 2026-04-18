import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing, getLiftShadow } from '@/config/tokens'
import { MoonMark, ProgressDots, SnoozyStar } from '@/components/Visuals'
import { SnoozyButton } from '@/components/SnoozyButton'
import { useStoryStore } from '@/stores/storyStore'

export const ONBOARDING_KEY = 'snoozy_onboarding_complete'
export const ONBOARDING_NAME_KEY = 'snoozy_onboarding_name'
export const ONBOARDING_AGE_KEY = 'snoozy_onboarding_age'

export function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState(6)

  async function complete() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    const trimmed = name.trim()
    if (trimmed) {
      await AsyncStorage.setItem(ONBOARDING_NAME_KEY, trimmed)
      await AsyncStorage.setItem(ONBOARDING_AGE_KEY, String(age))
      // Seed the store so every story form pre-fills with the declared child.
      useStoryStore.getState().setOnboardingDefaults({ name: trimmed, age })
    }
    onFinish()
  }

  if (step === 0) {
    return <SplashStep onBegin={() => setStep(1)} onSignIn={() => setStep(2)} />
  }
  if (step === 1) {
    return (
      <WhoForStep
        name={name}
        age={age}
        onName={setName}
        onAge={setAge}
        onBack={() => setStep(0)}
        onContinue={() => setStep(2)}
      />
    )
  }
  return (
    <SignInStep
      childName={name.trim() || null}
      onBack={() => setStep(1)}
      onComplete={complete}
    />
  )
}

// ─── 01 Splash ────────────────────────────────────────────────

function SplashStep({
  onBegin,
  onSignIn,
}: {
  onBegin: () => void
  onSignIn: () => void
}) {
  const { colors } = useThemeColors()
  const starPositions: [number, number, number, number][] = [
    [48, 120, 8, 0.5],
    [90, 200, 6, 0.35],
    [310, 150, 8, 0.5],
    [280, 240, 6, 0.4],
    [60, 300, 6, 0.35],
    [330, 80, 6, 0.4],
    [180, 90, 8, 0.55],
  ]

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[colors.primarySoft, colors.background, colors.backgroundDeep]}
        style={StyleSheet.absoluteFill}
      />

      {starPositions.map((p, i) => (
        <View key={i} style={{ position: 'absolute', left: p[0], top: p[1] }}>
          <SnoozyStar size={p[2]} color={colors.primary} opacity={p[3]} />
        </View>
      ))}

      <View style={styles.splashRoot}>
        <Text
          style={{
            fontFamily: 'Fraunces_500Medium_Italic',
            fontSize: 22,
            color: colors.ink,
            letterSpacing: -0.3,
            marginTop: 40,
            textAlign: 'center',
          }}
        >
          snoozy
        </Text>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* soft rings */}
          <View
            style={{
              position: 'absolute',
              width: 260,
              height: 260,
              borderRadius: 130,
              borderWidth: 1,
              borderColor: colors.primary + '14',
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 212,
              height: 212,
              borderRadius: 106,
              borderWidth: 1,
              borderColor: colors.primary + '2E',
            }}
          />

          <View
            style={[
              styles.hero,
              { shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 40, shadowOffset: { width: 0, height: 20 }, elevation: 16 },
            ]}
          >
            <MoonMark size={168} color={colors.primary} />
          </View>

          <View style={{ marginTop: 50, alignItems: 'center' }}>
            <Text style={[Fonts.serifTitle, { fontSize: 34, color: colors.ink, letterSpacing: -0.7 }]}>
              A quiet place
            </Text>
            <Text style={{ fontSize: 34, letterSpacing: -0.7, textAlign: 'center' }}>
              <Text style={{ color: colors.ink, fontFamily: 'Fraunces_400Regular' }}>for </Text>
              <Text style={{ color: colors.primary, fontFamily: 'Fraunces_400Regular_Italic' }}>
                bedtime stories.
              </Text>
            </Text>
            <Text
              style={[
                Fonts.body,
                {
                  color: colors.inkSoft,
                  textAlign: 'center',
                  marginTop: 14,
                  fontSize: 14,
                },
              ]}
            >
              {'Made just for your little one —\nin about three minutes.'}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 32, paddingBottom: 40, gap: 22 }}>
          <SnoozyButton title="Begin" onPress={onBegin} />
          <ProgressDots step={0} />
          <Pressable onPress={onSignIn}>
            <Text style={{ textAlign: 'center', fontSize: 12, fontFamily: 'Nunito_400Regular' }}>
              <Text style={{ color: colors.inkMute }}>I already have an account · </Text>
              <Text style={{ color: colors.primary, fontFamily: 'Nunito_700Bold' }}>
                Sign in
              </Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

// ─── 02 Who's it for ──────────────────────────────────────────

function WhoForStep({
  name,
  age,
  onName,
  onAge,
  onBack,
  onContinue,
}: {
  name: string
  age: number
  onName: (v: string) => void
  onAge: (v: number) => void
  onBack: () => void
  onContinue: () => void
}) {
  const { colors } = useThemeColors()
  const ages = [3, 4, 5, 6, 7, 8]
  const isValid = name.trim().length > 0

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.hair }]}
          >
            <Ionicons name="chevron-back" size={14} color={colors.ink} />
          </Pressable>
          <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>2 OF 3</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={{ paddingHorizontal: 32, paddingTop: 72 }}>
          <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>FIRST, TELL US —</Text>
          <Text
            style={[
              Fonts.serifTitle,
              { fontSize: 36, color: colors.ink, letterSpacing: -0.8, marginTop: 10 },
            ]}
          >
            Who are we
          </Text>
          <Text
            style={{
              fontSize: 36,
              fontFamily: 'Fraunces_400Regular_Italic',
              color: colors.primary,
              letterSpacing: -0.8,
            }}
          >
            tucking in tonight?
          </Text>
        </View>

        <View style={{ paddingHorizontal: 32, paddingTop: 48, gap: 20 }}>
          {/* Name card */}
          <View
            style={[
              styles.nameCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.hair,
                shadowColor: colors.ink,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: 'Nunito_700Bold',
                letterSpacing: 1,
                color: colors.inkMute,
              }}
            >
              THEIR NAME
            </Text>
            <TextInput
              value={name}
              onChangeText={onName}
              placeholder="e.g. Ava"
              placeholderTextColor={colors.inkMute}
              style={{
                fontFamily: 'Fraunces_500Medium_Italic',
                fontSize: 28,
                color: colors.ink,
                letterSpacing: -0.4,
                marginTop: 6,
                padding: 0,
              }}
              maxLength={50}
            />
          </View>

          {/* Age */}
          <View>
            <Text
              style={{
                fontSize: 11,
                fontFamily: 'Nunito_700Bold',
                letterSpacing: 1,
                color: colors.inkMute,
                paddingLeft: 4,
              }}
            >
              HOW OLD?
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {ages.map((a) => {
                const selected = age === a
                return (
                  <Pressable key={a} style={{ flex: 1 }} onPress={() => onAge(a)}>
                    <View
                      style={{
                        height: 48,
                        borderRadius: 14,
                        borderWidth: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? colors.ink : colors.surface,
                        borderColor: selected ? 'transparent' : colors.hair,
                        shadowColor: colors.ink,
                        shadowOpacity: selected ? 0.22 : 0,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 8 },
                        elevation: selected ? 4 : 0,
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? colors.background : colors.ink,
                          fontFamily: 'Fraunces_500Medium',
                          fontSize: 18,
                        }}
                      >
                        {a}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {/* Reassurance */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 10,
              padding: 14,
              borderRadius: 14,
              backgroundColor: colors.primarySoft,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.primaryInk }}>{'\u263E'}</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: 'Nunito_700Bold',
                  color: colors.primaryInk,
                }}
              >
                We'll keep this private.
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: 'Nunito_400Regular',
                  color: colors.primaryInk,
                  marginTop: 2,
                }}
              >
                Names help us make the story personal — they never leave your phone.
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ paddingHorizontal: 32, paddingTop: 40, paddingBottom: 40, gap: 22 }}>
          <View style={{ opacity: isValid ? 1 : 0.55 }}>
            <SnoozyButton title="Continue" onPress={onContinue} disabled={!isValid} />
          </View>
          <ProgressDots step={1} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── 03 Sign in ───────────────────────────────────────────────

function SignInStep({
  childName,
  onBack,
  onComplete,
}: {
  childName: string | null
  onBack: () => void
  onComplete: () => void
}) {
  const { colors, isDark } = useThemeColors()
  const headline = childName ? `Save ${childName}'s stories` : 'Save their stories'

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[colors.primarySoft, colors.background, colors.backgroundDeep]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topBar}>
        <Pressable
          onPress={onBack}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.hair }]}
        >
          <Ionicons name="chevron-back" size={14} color={colors.ink} />
        </Pressable>
        <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>3 OF 3</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ alignItems: 'center', marginTop: 54 }}>
        <LinearGradient
          colors={[colors.primary, '#8789E8', colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.heroMark,
            getLiftShadow(isDark),
            { shadowColor: colors.primary, shadowOpacity: 0.3 },
          ]}
        >
          <MoonMark size={40} color="#FFFFFF" />
        </LinearGradient>
      </View>

      <View style={{ alignItems: 'center', marginTop: 28, paddingHorizontal: 32 }}>
        <Text
          style={[
            Fonts.serifTitle,
            { fontSize: 30, color: colors.ink, letterSpacing: -0.6, textAlign: 'center' },
          ]}
        >
          {headline}
        </Text>
        <Text
          style={{
            fontSize: 30,
            fontFamily: 'Fraunces_400Regular_Italic',
            color: colors.primary,
            letterSpacing: -0.6,
            textAlign: 'center',
          }}
        >
          for another night.
        </Text>
        <Text
          style={[
            Fonts.body,
            {
              color: colors.inkSoft,
              textAlign: 'center',
              marginTop: 12,
              fontSize: 13,
              maxWidth: 280,
            },
          ]}
        >
          Sign in so your library follows you across devices.
        </Text>
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, marginTop: 48, gap: 10 }}>
        <Pressable onPress={onComplete}>
          <View
            style={[
              styles.social,
              { backgroundColor: colors.ink },
              getLiftShadow(isDark),
            ]}
          >
            <Ionicons name="logo-apple" size={18} color="#FFFFFF" />
            <Text
              style={{
                color: '#FFFFFF',
                fontFamily: 'Nunito_700Bold',
                fontSize: 15,
                marginLeft: 10,
              }}
            >
              Continue with Apple
            </Text>
          </View>
        </Pressable>
        <Pressable onPress={onComplete}>
          <View
            style={[
              styles.social,
              { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair },
            ]}
          >
            <Ionicons name="logo-google" size={18} color="#4285F4" />
            <Text
              style={{
                color: colors.ink,
                fontFamily: 'Nunito_700Bold',
                fontSize: 15,
                marginLeft: 10,
              }}
            >
              Continue with Google
            </Text>
          </View>
        </Pressable>

        {/* divider */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            marginVertical: 10,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: colors.hair }} />
          <Text style={[Fonts.eyebrow, { color: colors.inkMute, letterSpacing: 1.5 }]}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.hair }} />
        </View>

        <Pressable onPress={onComplete}>
          <View
            style={[
              styles.social,
              {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: 'rgba(43,33,48,0.2)',
                borderStyle: 'dashed',
              },
            ]}
          >
            <Text
              style={{
                color: colors.ink,
                fontFamily: 'Nunito_700Bold',
                fontSize: 14,
              }}
            >
              Use email instead
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ paddingHorizontal: 40, marginBottom: 28 }}>
        <Text
          style={{
            fontSize: 11,
            fontFamily: 'Nunito_400Regular',
            color: colors.inkMute,
            textAlign: 'center',
            lineHeight: 16,
          }}
        >
          By continuing you agree to our{'\n'}
          <Text style={{ color: colors.ink, fontFamily: 'Nunito_700Bold' }}>Terms</Text>
          {' and '}
          <Text style={{ color: colors.ink, fontFamily: 'Nunito_700Bold' }}>
            Privacy Policy
          </Text>
        </Text>
      </View>
      <View style={{ paddingBottom: 40 }}>
        <ProgressDots step={2} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  splashRoot: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCard: {
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroMark: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  social: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
})
