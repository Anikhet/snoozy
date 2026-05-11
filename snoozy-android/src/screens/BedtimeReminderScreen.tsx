import React, { useState, useCallback } from 'react'
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { scheduleBedtimeNotification } from '@/services/notificationService'
import { Colors, Fonts, Radii, Sizing, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { useBackHandler } from '@/hooks/useBackHandler'
import { BackSwipeZone } from '@/components/BackSwipeZone'

export const BEDTIME_KEY = 'snoozy_bedtime'

export interface BedtimeValue {
  hour: number
  minute: number
  period: 'AM' | 'PM'
}

export function formatBedtime(b: BedtimeValue): string {
  return `${b.hour}:${b.minute.toString().padStart(2, '0')} ${b.period}`
}

const DEFAULT_BEDTIME: BedtimeValue = { hour: 8, minute: 0, period: 'PM' }
const MINUTE_STEPS = [0, 15, 30, 45]

function Stepper({
  value,
  display,
  onDecrement,
  onIncrement,
  label,
}: {
  value: string
  display?: string
  onDecrement: () => void
  onIncrement: () => void
  label: string
}) {
  return (
    <View style={styles.stepperBlock}>
      <Text style={[Fonts.caption, styles.stepperLabel]}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={onDecrement}
          style={styles.stepBtn}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          hitSlop={8}
        >
          <Ionicons name="remove" size={18} color="#5B5BD6" />
        </Pressable>
        <Text style={styles.stepValue}>{display ?? value}</Text>
        <Pressable
          onPress={onIncrement}
          style={styles.stepBtn}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          hitSlop={8}
        >
          <Ionicons name="add" size={18} color="#5B5BD6" />
        </Pressable>
      </View>
    </View>
  )
}

export function BedtimeReminderScreen() {
  const closeProfilePanel = useStoryStore((s) => s.closeProfilePanel)
  useBackHandler(closeProfilePanel)

  const [bedtime, setBedtime] = useState<BedtimeValue>(DEFAULT_BEDTIME)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load existing bedtime on mount
  React.useEffect(() => {
    AsyncStorage.getItem(BEDTIME_KEY).then((raw) => {
      if (raw) setBedtime(JSON.parse(raw))
      setLoaded(true)
    })
  }, [])

  const adjustHour = useCallback((delta: number) => {
    setBedtime((prev) => {
      const next = ((prev.hour - 1 + delta + 12) % 12) + 1
      return { ...prev, hour: next }
    })
  }, [])

  const adjustMinute = useCallback((delta: number) => {
    setBedtime((prev) => {
      const idx = MINUTE_STEPS.indexOf(prev.minute)
      const next = MINUTE_STEPS[(idx + delta + MINUTE_STEPS.length) % MINUTE_STEPS.length]
      return { ...prev, minute: next }
    })
  }, [])

  const togglePeriod = useCallback(() => {
    setBedtime((prev) => ({ ...prev, period: prev.period === 'AM' ? 'PM' : 'AM' }))
  }, [])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      await AsyncStorage.setItem(BEDTIME_KEY, JSON.stringify(bedtime))
      // Schedule the daily notification only if the user has enabled it
      const notifRaw = await AsyncStorage.getItem('snoozy_notifications')
      if (notifRaw === 'true') {
        await scheduleBedtimeNotification(bedtime)
      }
    } catch {}
    setSaving(false)
    closeProfilePanel()
  }, [saving, bedtime, closeProfilePanel])

  if (!loaded) return null

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
            <Ionicons name="chevron-back" size={22} color={Colors.light.purpleMid} />
          </Pressable>
          <Text style={styles.headerTitle}>Bedtime Reminder</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.heroBlock}>
            <Text style={styles.heroEmoji}>🌙</Text>
            <Text style={styles.heroTitle}>Set story time</Text>
            <Text style={[Fonts.body, styles.heroSubtitle]}>
              When should tonight's adventure begin?
            </Text>
          </Animated.View>

          {/* Time picker card */}
          <Animated.View entering={FadeInDown.delay(160).duration(420)} style={styles.card}>
            <View style={styles.pickerRow}>
              {/* Hour */}
              <Stepper
                value={String(bedtime.hour)}
                onDecrement={() => adjustHour(-1)}
                onIncrement={() => adjustHour(1)}
                label="Hour"
              />

              <Text style={styles.colon}>:</Text>

              {/* Minute */}
              <Stepper
                value={String(bedtime.minute)}
                display={bedtime.minute.toString().padStart(2, '0')}
                onDecrement={() => adjustMinute(-1)}
                onIncrement={() => adjustMinute(1)}
                label="Min"
              />

              <View style={styles.periodBlock}>
                <Text style={[Fonts.caption, styles.stepperLabel]}>Period</Text>
                <Pressable
                  onPress={togglePeriod}
                  style={styles.periodToggle}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${bedtime.period === 'AM' ? 'PM' : 'AM'}`}
                >
                  <Text style={[styles.periodOption, bedtime.period === 'AM' && styles.periodActive]}>AM</Text>
                  <View style={styles.periodDivider} />
                  <Text style={[styles.periodOption, bedtime.period === 'PM' && styles.periodActive]}>PM</Text>
                </Pressable>
              </View>
            </View>

            {/* Preview */}
            <View style={styles.previewRow}>
              <Ionicons name="alarm-outline" size={16} color={Colors.light.primaryMuted} />
              <Text style={[Fonts.caption, styles.previewText]}>
                Story starts at {formatBedtime(bedtime)}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).duration(420)} style={styles.hintRow}>
            <Ionicons name="notifications-outline" size={14} color={Colors.light.primaryMuted} />
            <Text style={[Fonts.caption, styles.hintText]}>
              Turn on notifications in Profile to get a reminder
            </Text>
          </Animated.View>

          <View style={styles.ctaSpacer} />
        </ScrollView>

        {/* Sticky CTA */}
        <View style={styles.ctaBar}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1, borderRadius: Radii.button })}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#5B5BD6', Colors.light.primaryMuted]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaLabel}>{saving ? 'Saving…' : 'Save reminder'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8E2F8' },
  safe: { flex: 1 },
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
    color: Colors.light.purpleMid,
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
    color: Colors.light.purpleDeep,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: { color: Colors.light.purpleSoft, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.cardLarge,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F0EBFF',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  stepperBlock: { alignItems: 'center' },
  stepperLabel: { color: Colors.light.primaryMuted, marginBottom: Spacing.xs },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5FF',
    borderRadius: Radii.field,
    borderWidth: 1.5,
    borderColor: 'rgba(91,91,214,0.18)',
    overflow: 'hidden',
  },
  stepBtn: {
    width: 32,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: Colors.light.purpleDeep,
    minWidth: 32,
    textAlign: 'center',
  },
  colon: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
    color: Colors.light.purpleMid,
    marginBottom: Spacing.xs,
    paddingHorizontal: 4,
  },
  periodBlock: { alignItems: 'center' },
  periodToggle: {
    backgroundColor: '#F7F5FF',
    borderRadius: Radii.field,
    borderWidth: 1.5,
    borderColor: 'rgba(91,91,214,0.18)',
    overflow: 'hidden',
  },
  periodOption: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: Colors.light.primaryMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    textAlign: 'center',
  },
  periodActive: { color: '#5B5BD6', backgroundColor: '#EDE9FF' },
  periodDivider: { height: 1, backgroundColor: 'rgba(91,91,214,0.12)' },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(91,91,214,0.08)',
  },
  previewText: { color: Colors.light.purpleSoft },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  hintText: { color: Colors.light.primaryMuted, flex: 1, textAlign: 'center' },
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
    color: '#FFFFFF',
  },
})
