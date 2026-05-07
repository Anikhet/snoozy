import React, { useEffect, useState } from 'react'
import {
  BackHandler,
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
import { useSignIn, useSignUp, useSSO } from '@clerk/clerk-expo'
import { Ionicons } from '@expo/vector-icons'
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
import { Radii, Sizing, Spacing } from '@/config/tokens'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

type AuthMode = 'signIn' | 'signUp' | 'verifyEmail'

// ─── Field ────────────────────────────────────────────────────────────────────

interface FieldProps {
  icon: keyof typeof Ionicons.glyphMap
  placeholder: string
  value: string
  onChangeText: (v: string) => void
  secure?: boolean
  keyboardType?: 'email-address' | 'default' | 'number-pad'
  autoCapitalize?: 'none' | 'words'
}

function Field({ icon, placeholder, value, onChangeText, secure, keyboardType = 'default', autoCapitalize = 'none' }: FieldProps) {
  const [hidden, setHidden] = useState(secure ?? false)

  return (
    <View style={fieldStyles.row}>
      <Ionicons name={icon} size={18} color="#9B8EC4" style={fieldStyles.icon} />
      <TextInput
        style={fieldStyles.input}
        placeholder={placeholder}
        placeholderTextColor="#B0A5CC"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={hidden}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
      {secure ? (
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
          <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color="#9B8EC4" />
        </Pressable>
      ) : null}
    </View>
  )
}

const fieldStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.field,
    paddingHorizontal: Spacing.md,
    height: 52,
    gap: Spacing.sm,
  },
  icon: { width: 20 },
  input: {
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: '#2D1F6E',
  },
})

// ─── Primary button ────────────────────────────────────────────────────────────

function PrimaryButton({ label, onPress, loading }: { label: string; onPress: () => void; loading?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      android_ripple={{ color: 'transparent' }}
      style={({ pressed }) => ({ opacity: pressed || loading ? 0.82 : 1, borderRadius: Radii.button })}
    >
      <LinearGradient
        colors={['#5B5BD6', '#9B8EC4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={btnStyles.gradient}
      >
        <Text style={btnStyles.label}>✦  {label}</Text>
      </LinearGradient>
    </Pressable>
  )
}

const btnStyles = StyleSheet.create({
  gradient: {
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
})

// ─── Social button ─────────────────────────────────────────────────────────────

function SocialButton({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [socialStyles.btn, { opacity: pressed ? 0.75 : 1 }]}
    >
      {icon}
      <Text style={socialStyles.label}>{label}</Text>
    </Pressable>
  )
}

const socialStyles = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: Radii.button,
    gap: 7,
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: '#2D1F6E',
  },
})

// ─── AuthScreen ────────────────────────────────────────────────────────────────

export function AuthScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn()
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp()
  const { startSSOFlow: startApple } = useSSO()
  const { startSSOFlow: startGoogle } = useSSO()

  const [mode, setMode] = useState<AuthMode>('signIn')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetFields = () => {
    setError(null)
    setPassword('')
    setConfirmPassword('')
    setCode('')
  }

  const switchMode = (next: AuthMode) => {
    resetFields()
    setMode(next)
  }

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mode === 'signUp') { switchMode('signIn'); return true }
      if (mode === 'verifyEmail') { switchMode('signUp'); return true }
      return false  // signIn: let OS handle it (exits app)
    })
    return () => sub.remove()
  }, [mode])

  const onSignIn = async () => {
    if (!isSignInLoaded) return
    setIsLoading(true); setError(null)
    try {
      const res = await signIn.create({ identifier: email, password })
      await setSignInActive({ session: res.createdSessionId })
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Sign in failed')
    } finally {
      setIsLoading(false)
    }
  }

  const onSignUp = async () => {
    if (!isSignUpLoaded) return
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setIsLoading(true); setError(null)
    try {
      await signUp.create({ firstName, lastName, emailAddress: email, password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setMode('verifyEmail')
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Sign up failed')
    } finally {
      setIsLoading(false)
    }
  }

  const onVerify = async () => {
    if (!isSignUpLoaded) return
    setIsLoading(true); setError(null)
    try {
      const res = await signUp.attemptEmailAddressVerification({ code })
      await setSignUpActive({ session: res.createdSessionId })
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const onApple = async () => {
    try {
      const { createdSessionId, setActive } = await startApple({ strategy: 'oauth_apple' })
      if (createdSessionId && setActive) await setActive({ session: createdSessionId })
    } catch { /* cancelled */ }
  }

  const onGoogle = async () => {
    try {
      const { createdSessionId, setActive } = await startGoogle({ strategy: 'oauth_google' })
      if (createdSessionId && setActive) await setActive({ session: createdSessionId })
    } catch { /* cancelled */ }
  }

  return (
    <ImageBackground
      source={require('../../assets/images/bg-loading.png')}
      style={styles.root}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['transparent', '#EDE8F822', '#EDE8F899']}
        locations={[0, 0, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {mode === 'signIn' && <SignInView
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              onSignIn={onSignIn} onApple={onApple} onGoogle={onGoogle}
              onSignUp={() => switchMode('signUp')}
              isLoading={isLoading} error={error}
            />}

            {mode === 'signUp' && <SignUpView
              firstName={firstName} setFirstName={setFirstName}
              lastName={lastName} setLastName={setLastName}
              email={email} setEmail={setEmail}
              password={password} setPassword={setPassword}
              confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
              onSignUp={onSignUp}
              onSignIn={() => switchMode('signIn')}
              isLoading={isLoading} error={error}
            />}

            {mode === 'verifyEmail' && <VerifyView
              code={code} setCode={setCode}
              onVerify={onVerify}
              onBack={() => switchMode('signUp')}
              isLoading={isLoading} error={error}
            />}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  )
}

// ─── Sign In View ──────────────────────────────────────────────────────────────

function SignInView({ email, setEmail, password, setPassword, onSignIn, onApple, onGoogle, onSignUp, isLoading, error }: any) {
  const floatY = useSharedValue(0)
  const mascotFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }))

  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(-10, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    )
  }, [])

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.page}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.brandBlock}>
        <Text style={styles.brandTitle}>Snoozy</Text>
        <Text style={styles.brandSub}>Bedtime stories, made magical</Text>
      </Animated.View>

      {/* Mascot */}
      <Animated.View entering={FadeIn.delay(100).duration(700)} style={styles.signInMascotBlock}>
        <Animated.Image
          source={require('../../assets/images/mascot-heart.png')}
          style={[styles.mascot, mascotFloatStyle]}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Card */}
      <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.card}>
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>Welcome back, dreamer</Text>
        </View>
        <Text style={styles.cardSub}>Sign in to continue your story</Text>

        <View style={styles.fields}>
          <Field icon="mail-outline" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword} secure />
        </View>

        <Pressable style={styles.forgotRow}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Log In" onPress={onSignIn} loading={isLoading} />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <SocialButton
            icon={<Ionicons name="logo-apple" size={20} color="#2D1F6E" />}
            label="Apple"
            onPress={onApple}
          />
          <SocialButton
            icon={<Text style={styles.googleG}>G</Text>}
            label="Google"
            onPress={onGoogle}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={onSignUp}>
            <Text style={styles.footerLink}>Sign up</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

// ─── Sign Up View ──────────────────────────────────────────────────────────────

function SignUpView({ firstName, setFirstName, lastName, setLastName, email, setEmail, password, setPassword, confirmPassword, setConfirmPassword, onSignUp, onSignIn, isLoading, error }: any) {

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.page}>
      {/* Back */}
      <Pressable onPress={onSignIn} style={styles.backBtn} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color="#2D1F6E" />
      </Pressable>

      {/* Card with peeking mascot anchored to its top */}
      <View style={styles.mascotCardWrapper}>
        <Animated.Image
          entering={FadeIn.delay(100).duration(700)}
          source={require('../../assets/images/mascot-peeking.png')}
          style={styles.mascotPeeking}
          resizeMode="contain"
        />
        <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.card}>
        <View style={styles.welcomeRow}>
          <Text style={[styles.welcomeText, styles.signupTitle]}>{'Create your\nSnoozy account'}</Text>
        </View>
        <Text style={styles.cardSub}>Let's start your dreamy adventure</Text>

        <View style={styles.fields}>
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Field icon="person-outline" placeholder="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
            </View>
            <View style={styles.nameField}>
              <Field icon="person-outline" placeholder="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
            </View>
          </View>
          <Field icon="mail-outline" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Field icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword} secure />
          <Field icon="lock-closed-outline" placeholder="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secure />
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="heart" size={20} color="#FFFFFF" />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Your stories, your way</Text>
            <Text style={styles.infoBody}>We'll remember your preferences and progress to make every story extra special.</Text>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Create Account" onPress={onSignUp} loading={isLoading} />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={onSignIn}>
            <Text style={styles.footerLink}>Log in</Text>
          </Pressable>
        </View>
      </Animated.View>
      </View>
    </Animated.View>
  )
}

// ─── Verify Email View ─────────────────────────────────────────────────────────

function VerifyView({ code, setCode, onVerify, onBack, isLoading, error }: any) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.page}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
        <Ionicons name="chevron-back" size={22} color="#2D1F6E" />
      </Pressable>

      <Animated.View entering={FadeInUp.delay(100).duration(500)} style={[styles.card, styles.cardTopSpaced]}>
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>Check your email</Text>
          <Text style={styles.sparkle}> ✉️</Text>
        </View>
        <Text style={styles.cardSub}>Enter the 6-digit code we sent you</Text>

        <View style={styles.fields}>
          <Field icon="key-outline" placeholder="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton label="Verify Email" onPress={onVerify} loading={isLoading} />

        <View style={styles.footerRow}>
          <Pressable onPress={onBack}>
            <Text style={styles.footerLink}>← Back to sign up</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EDE8F8' },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, justifyContent: 'center' },

  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Brand
  brandBlock: { alignItems: 'center', paddingTop: Spacing.sm, gap: 0 },
  brandTitle: { fontFamily: 'Nunito_700Bold', fontSize: 54, color: '#2D1F6E', letterSpacing: -1 },
  brandSub: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#7B6B9E', marginTop: -8 },

  // Sign-in floating mascot
  signInMascotBlock: { width: SCREEN_WIDTH * 0.8, height: SCREEN_WIDTH * 0.63, alignItems: 'center', justifyContent: 'center', marginBottom: -27 },

  // Mascot anchored to card
  mascotCardWrapper: { width: '100%', marginTop: 70 },
  mascotPeeking: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    alignSelf: 'center',
    position: 'absolute',
    top: -(SCREEN_WIDTH * 0.6 * 0.59),
    zIndex: 10,
  },
  mascot: { width: '100%', height: '100%' },

  // Card
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 28,
    paddingHorizontal: Spacing.lg,
    paddingTop: SCREEN_WIDTH * 0.45 * 0.1,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  cardTopSpaced: { marginTop: Spacing.md },

  // Welcome
  welcomeRow: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: Spacing.sm },
  welcomeText: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: '#2D1F6E' },
  signupTitle: { fontSize: 26, lineHeight: 34 },
  sparkle: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: '#C9A56B' },
  cardSub: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: '#7B6B9E', marginTop: -Spacing.sm },

  // Fields
  fields: { gap: Spacing.sm },
  nameRow: { flexDirection: 'row', gap: Spacing.sm },
  nameField: { flex: 1 },

  // Forgot
  forgotRow: { alignItems: 'flex-end', marginTop: -Spacing.sm },
  forgotText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#5B3DA8' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(43,33,48,0.10)' },
  dividerText: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: '#9B8EC4' },

  // Social
  socialRow: { flexDirection: 'row', gap: Spacing.sm },
  googleG: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: '#4285F4' },

  // Info card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(91,61,168,0.10)',
    borderRadius: Radii.card,
    padding: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#7B5BD6',
    alignItems: 'center', justifyContent: 'center',
  },
  infoText: { flex: 1, gap: 2 },
  infoTitle: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#2D1F6E' },
  infoBody: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: '#7B6B9E', lineHeight: 17 },

  // Footer
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: '#7B6B9E' },
  footerLink: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#5B3DA8' },

  // Back
  backBtn: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.md,
    width: 36, height: 36,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 20,
  },

  // Error
  error: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: '#D96C6C', textAlign: 'center' },
})
