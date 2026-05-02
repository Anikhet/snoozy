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
import { LinearGradient } from 'expo-linear-gradient'
import { useSignIn, useSignUp } from '@clerk/clerk-expo'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { SnoozyButton } from '@/components/SnoozyButton'
import { ProgressDots } from '@/components/ProgressDots'
import { MoonMark } from '@/components/MoonMark'
import { OnboardingSplash } from '@/components/OnboardingSplash'
import { OnboardingWhoFor } from '@/components/OnboardingWhoFor'

type AuthMode = 'signIn' | 'signUp' | 'verifyEmail'

export function AuthScreen() {
  const { colors } = useThemeColors()
  const [step, setStep] = useState(0)

  if (step === 0) return <OnboardingSplash colors={colors} onNext={() => setStep(1)} onSignIn={() => setStep(2)} />
  if (step === 1) return <OnboardingWhoFor colors={colors} onNext={() => setStep(2)} onBack={() => setStep(0)} />
  return <SignInStep colors={colors} onBack={() => setStep(1)} />
}

/* ─── Step 2: Sign In ─── */
function SignInStep({
  colors,
  onBack,
}: {
  colors: ReturnType<typeof useThemeColors>['colors']
  onBack: () => void
}) {
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn()
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp()
  const childDetails = useStoryStore((s) => s.childDetails)
  const childName = childDetails.name || 'their'

  const [mode, setMode] = useState<AuthMode>('signUp')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSignInPress = async () => {
    if (!isSignInLoaded) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await signIn.create({ identifier: email, password })
      await setSignInActive({ session: result.createdSessionId })
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Sign in failed')
    } finally {
      setIsLoading(false)
    }
  }

  const onSignUpPress = async () => {
    if (!isSignUpLoaded) return
    setIsLoading(true)
    setError(null)
    try {
      await signUp.create({ emailAddress: email, password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setMode('verifyEmail')
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const onVerifyPress = async () => {
    if (!isSignUpLoaded) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      await setSignUpActive({ session: result.createdSessionId })
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.fullScreen, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          onPress={onBack}
          style={[styles.backCircle, { backgroundColor: colors.surface, borderColor: colors.hair }]}
        >
          <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '600' }}>{'\u2039'}</Text>
        </Pressable>

        {/* Hero mark */}
        <View style={styles.heroMarkWrap}>
          <LinearGradient
            colors={[colors.primary, '#8789E8', colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroMark}
          >
            <MoonMark size={32} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={[Fonts.serifTitle, { color: colors.ink, textAlign: 'center' }]}>
          Save {childName}&apos;s stories
        </Text>
        <Text style={[Fonts.serifTitleItalic, { color: colors.primary, textAlign: 'center' }]}>
          for another night.
        </Text>

        {mode !== 'verifyEmail' ? (
          <View style={styles.formFields}>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              placeholder="Email"
              placeholderTextColor={colors.inkMute}
              onChangeText={setEmail}
              style={[styles.input, { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.hair }]}
            />
            <TextInput
              secureTextEntry
              value={password}
              placeholder="Password"
              placeholderTextColor={colors.inkMute}
              onChangeText={setPassword}
              style={[styles.input, { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.hair }]}
            />
          </View>
        ) : (
          <View style={styles.formFields}>
            <Text style={[Fonts.caption, { color: colors.inkSoft, textAlign: 'center' }]}>
              Enter the code we sent to your inbox.
            </Text>
            <TextInput
              value={code}
              placeholder="Verification Code"
              placeholderTextColor={colors.inkMute}
              onChangeText={setCode}
              style={[styles.input, { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.hair }]}
            />
          </View>
        )}

        {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}

        {mode === 'signIn' ? (
          <SnoozyButton title="Sign In" onPress={onSignInPress} disabled={isLoading} />
        ) : mode === 'signUp' ? (
          <SnoozyButton title="Continue" onPress={onSignUpPress} disabled={isLoading} />
        ) : (
          <SnoozyButton title="Verify" onPress={onVerifyPress} disabled={isLoading} />
        )}

        {mode !== 'verifyEmail' ? (
          <Pressable onPress={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError(null) }}>
            <Text style={[styles.toggleText, { color: colors.inkMute }]}>
              {mode === 'signIn' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {mode === 'signIn' ? 'Sign up' : 'Sign in'}
              </Text>
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setMode('signUp')}>
            <Text style={[styles.toggleText, { color: colors.primary, fontWeight: '700' }]}>
              Back to Sign Up
            </Text>
          </Pressable>
        )}

        <ProgressDots currentStep={2} />

        <Text style={[styles.legalText, { color: colors.inkMute }]}>
          By continuing, you agree to Snoozy&apos;s Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  content: {
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
  },
  backCircle: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
  },
  heroMarkWrap: { marginTop: Spacing.xl, marginBottom: Spacing.md },
  heroMark: {
    width: 64, height: 64, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  formFields: { width: '100%', gap: Spacing.md, marginTop: Spacing.lg },
  input: {
    height: 54, borderRadius: 16, borderWidth: 1,
    paddingHorizontal: 18, fontSize: 16, fontFamily: 'Nunito_400Regular', width: '100%',
  },
  errorText: { fontSize: 12, textAlign: 'center', fontFamily: 'Nunito_400Regular' },
  toggleText: { fontSize: 12, fontFamily: 'Nunito_400Regular', textAlign: 'center' },
  legalText: {
    fontSize: 11, fontFamily: 'Nunito_400Regular', textAlign: 'center', marginTop: Spacing.lg,
  },
})
