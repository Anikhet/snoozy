import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { useSignIn, useSignUp } from '@clerk/clerk-expo'
import { Colors, Fonts, Spacing, Radii, getCardShadow } from '@/config/tokens'
import { AppIcon } from '@/components/AppIcon'
import { SnoozyButton } from '@/components/SnoozyButton'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'

type AuthMode = 'signIn' | 'signUp' | 'verifyEmail'

export function AuthScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn()
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp()

  const [mode, setMode] = useState<AuthMode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const colors = isDark ? Colors.dark : Colors.light

  const onSignInPress = async () => {
    if (!isSignInLoaded) return
    setIsLoading(true)
    setError(null)
    try {
      const completeSignIn = await signIn.create({
        identifier: email,
        password,
      })
      await setSignInActive({ session: completeSignIn.createdSessionId })
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
      await signUp.create({
        emailAddress: email,
        password,
      })
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
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      })
      await setSignUpActive({ session: completeSignUp.createdSessionId })
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'signIn' ? 'signUp' : 'signIn')
    setError(null)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View 
          entering={FadeInUp.duration(600).springify()}
          style={styles.header}
        >
          <AppIcon name="moon.stars.fill" size={60} color={colors.primary} />
          <Text style={[Fonts.largeTitle, { color: colors.textPrimary, marginTop: Spacing.md }]}>
            Snoozy
          </Text>
          <Text style={[Fonts.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            Personalized bedtime stories.
          </Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(200).duration(600)}
          style={styles.form}
        >
          <Text style={[Fonts.headline, { color: colors.textPrimary, marginBottom: Spacing.lg }]}>
            {mode === 'verifyEmail' ? 'Verify your Email' : mode === 'signIn' ? 'Sign In' : 'Create Account'}
          </Text>

          {mode !== 'verifyEmail' ? (
            <>
              <TextInput
                autoCapitalize="none"
                value={email}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary + '80'}
                onChangeText={setEmail}
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface }, getCardShadow(isDark)]}
              />
              <TextInput
                secureTextEntry
                value={password}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary + '80'}
                onChangeText={setPassword}
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, marginTop: Spacing.md }, getCardShadow(isDark)]}
              />
            </>
          ) : (
            <TextInput
              value={code}
              placeholder="Verification Code"
              placeholderTextColor={colors.textSecondary + '80'}
              onChangeText={setCode}
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface }, getCardShadow(isDark)]}
            />
          )}

          {error && <Text style={[styles.errorText, { color: '#FF3B30' }]}>{error}</Text>}

          <View style={styles.buttonContainer}>
            {mode === 'signIn' && (
              <SnoozyButton 
                title="Sign In" 
                icon="log-in-outline" 
                onPress={onSignInPress} 
                disabled={isLoading} 
              />
            )}
            {mode === 'signUp' && (
              <SnoozyButton 
                title="Sign Up" 
                icon="person-add-outline" 
                onPress={onSignUpPress} 
                disabled={isLoading} 
              />
            )}
            {mode === 'verifyEmail' && (
              <SnoozyButton 
                title="Verify" 
                icon="checkmark-circle-outline" 
                onPress={onVerifyPress} 
                disabled={isLoading} 
              />
            )}
          </View>

          {mode !== 'verifyEmail' && (
            <TouchableOpacity onPress={toggleMode} style={styles.toggleMode}>
              <Text style={[Fonts.caption, { color: colors.textSecondary }]}>
                {mode === 'signIn' ? "Don't have an account? " : "Already have an account? "}
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  {mode === 'signIn' ? 'Sign up' : 'Sign in'}
                </Text>
              </Text>
            </TouchableOpacity>
          )}

          {mode === 'verifyEmail' && (
            <TouchableOpacity onPress={() => setMode('signUp')} style={styles.toggleMode}>
              <Text style={[Fonts.caption, { color: colors.primary, fontWeight: '700' }]}>
                Back to Sign Up
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  form: {
    width: '100%',
  },
  input: {
    padding: Spacing.md,
    borderRadius: Radii.small,
    fontSize: 16,
    borderWidth: 0,
  },
  buttonContainer: {
    marginTop: Spacing.xl,
  },
  toggleMode: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    marginTop: Spacing.sm,
    fontSize: 12,
    textAlign: 'center',
  },
})
