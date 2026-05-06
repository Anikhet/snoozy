import React, { useState, useCallback } from 'react'
import {
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
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useUser } from '@clerk/clerk-expo'
import { Fonts, Radii, Sizing, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { useBackHandler } from '@/hooks/useBackHandler'
import { BackSwipeZone } from '@/components/BackSwipeZone'

function SecureInput({
  label,
  placeholder,
  value,
  onChangeText,
}: {
  label: string
  placeholder: string
  value: string
  onChangeText: (text: string) => void
}) {
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, { borderColor: focused ? '#5B5BD6' : 'rgba(91,91,214,0.18)' }]}>
        <Ionicons name="lock-closed-outline" size={18} color="#9B8EC4" />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B0A5CC"
          secureTextEntry={!visible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9B8EC4" />
        </Pressable>
      </View>
    </View>
  )
}

export function PasswordSecurityScreen() {
  const closeProfilePanel = useStoryStore((s) => s.closeProfilePanel)
  useBackHandler(closeProfilePanel)

  const { user } = useUser()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const isOAuthOnly = (user?.externalAccounts?.length ?? 0) > 0 && !user?.passwordEnabled

  const canSubmit = current.length >= 8 && next.length >= 8 && next === confirm && !saving

  const handleUpdate = useCallback(async () => {
    if (!canSubmit) return
    if (next !== confirm) {
      setError('New passwords do not match.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await user?.updatePassword({ currentPassword: current, newPassword: next })
      setSuccess(true)
      setTimeout(() => closeProfilePanel(), 1400)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }, [canSubmit, current, next, confirm, user, closeProfilePanel])

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../assets/images/bg-loading.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(232,226,248,0.55)', 'rgba(248,244,255,0.80)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <BackSwipeZone onBack={closeProfilePanel} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={closeProfilePanel} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={22} color="#4B367C" />
          </Pressable>
          <Text style={styles.headerTitle}>Password & Security</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.heroBlock}>
              <Text style={styles.heroEmoji}>🔐</Text>
              <Text style={styles.heroTitle}>Update password</Text>
              <Text style={[Fonts.body, styles.heroSubtitle]}>
                Keep your account safe with a strong password
              </Text>
            </Animated.View>

            {isOAuthOnly ? (
              <Animated.View entering={FadeInDown.delay(160).duration(420)} style={styles.oauthCard}>
                <Ionicons name="information-circle-outline" size={28} color="#7B5EA7" />
                <Text style={styles.oauthTitle}>Social sign-in detected</Text>
                <Text style={[Fonts.body, styles.oauthSubtitle]}>
                  Your account uses{' '}
                  {user?.externalAccounts?.[0]?.provider ?? 'a social provider'} to sign in.
                  Password management is handled by your provider.
                </Text>
              </Animated.View>
            ) : (
              <>
                <Animated.View entering={FadeInDown.delay(160).duration(420)} style={styles.card}>
                  <SecureInput
                    label="Current password"
                    placeholder="Enter current password"
                    value={current}
                    onChangeText={setCurrent}
                  />
                  <View style={styles.divider} />
                  <SecureInput
                    label="New password"
                    placeholder="Min. 8 characters"
                    value={next}
                    onChangeText={setNext}
                  />
                  <View style={styles.divider} />
                  <SecureInput
                    label="Confirm new password"
                    placeholder="Repeat new password"
                    value={confirm}
                    onChangeText={setConfirm}
                  />
                </Animated.View>

                {/* Validation hints */}
                <Animated.View entering={FadeInDown.delay(220).duration(420)} style={styles.hintList}>
                  <HintRow met={next.length >= 8} text="At least 8 characters" />
                  <HintRow met={next === confirm && confirm.length > 0} text="Passwords match" />
                </Animated.View>

                {error ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={16} color="#D96C6C" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {success ? (
                  <View style={styles.successBanner}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#4CAF50" />
                    <Text style={styles.successText}>Password updated successfully!</Text>
                  </View>
                ) : null}
              </>
            )}

            <View style={styles.ctaSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Sticky CTA */}
        {!isOAuthOnly && (
          <View style={styles.ctaBar}>
            <Pressable
              onPress={handleUpdate}
              disabled={!canSubmit || success}
              style={({ pressed }) => ({
                opacity: pressed ? 0.82 : canSubmit && !success ? 1 : 0.45,
                borderRadius: Radii.button,
              })}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={canSubmit && !success ? ['#5B5BD6', '#9B8EC4'] : ['#D4CEDE', '#D4CEDE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={[styles.ctaLabel, { color: canSubmit && !success ? '#FFFFFF' : '#9B8EC4' }]}>
                  {saving ? 'Updating…' : success ? 'Done ✓' : 'Update password'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  )
}

function HintRow({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.hintRow}>
      <Ionicons
        name={met ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={met ? '#4CAF50' : '#B0A5CC'}
      />
      <Text style={[Fonts.caption, { color: met ? '#4CAF50' : '#9B8EC4' }]}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8E2F8' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    color: '#4B367C',
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Sizing.buttonHeight + Spacing.xxl,
  },
  heroBlock: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  heroEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  heroTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 26,
    color: '#2D1F6E',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: { color: '#7B6B9E', textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.cardLarge,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F0EBFF',
  },
  fieldLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: '#4B367C',
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: Radii.field,
    paddingHorizontal: Spacing.md,
    height: 48,
    backgroundColor: '#F7F5FF',
  },
  input: {
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: '#2D1F6E',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(91,91,214,0.08)',
    marginVertical: Spacing.md,
  },
  hintList: {
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FFF0F0',
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: '#FFD6D6',
  },
  errorText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: '#D96C6C',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#F0FFF4',
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  successText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: '#4CAF50',
  },
  oauthCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.cardLarge,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#F0EBFF',
    gap: Spacing.sm,
  },
  oauthTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    color: '#4B367C',
    textAlign: 'center',
  },
  oauthSubtitle: { color: '#7B6B9E', textAlign: 'center' },
  ctaSpacer: { height: Sizing.buttonHeight + Spacing.xxl },
  ctaBar: {
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
  },
})
