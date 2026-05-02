import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { Fonts, Spacing, ThemeColors } from '@/config/tokens'
import { TIMER_OPTIONS } from '@/services/audioService'

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

interface SleepTimerProps {
  isNight: boolean
  isSleepTimerActive: boolean
  sleepTimerRemaining: number | null
  showTimerPicker: boolean
  onTogglePicker: () => void
  onStartTimer: (seconds: number) => void
  onCancelTimer: () => void
  colors: ThemeColors
}

export function SleepTimerSection({
  isNight,
  isSleepTimerActive,
  sleepTimerRemaining,
  showTimerPicker,
  onTogglePicker,
  onStartTimer,
  onCancelTimer,
  colors,
}: SleepTimerProps) {
  if (isNight) {
    return (
      <NightDrawer
        isSleepTimerActive={isSleepTimerActive}
        sleepTimerRemaining={sleepTimerRemaining}
        showTimerPicker={showTimerPicker}
        onTogglePicker={onTogglePicker}
        onStartTimer={onStartTimer}
        onCancelTimer={onCancelTimer}
        colors={colors}
      />
    )
  }

  return (
    <DayTimer
      isSleepTimerActive={isSleepTimerActive}
      sleepTimerRemaining={sleepTimerRemaining}
      showTimerPicker={showTimerPicker}
      onTogglePicker={onTogglePicker}
      onStartTimer={onStartTimer}
      onCancelTimer={onCancelTimer}
      colors={colors}
    />
  )
}

/* ─── Day Mode ─── */
function DayTimer({
  isSleepTimerActive,
  sleepTimerRemaining,
  showTimerPicker,
  onTogglePicker,
  onStartTimer,
  onCancelTimer,
  colors,
}: Omit<SleepTimerProps, 'isNight'>) {
  return (
    <View style={styles.container}>
      {isSleepTimerActive ? (
        <View style={[styles.chip, { backgroundColor: colors.primarySoft }]}>
          <View style={[styles.moonCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.moonGlyph}>{'\u263E'}</Text>
          </View>
          <Text style={[Fonts.caption2Bold, { color: colors.primaryInk }]}>
            Sleep timer {'\u00B7'} {formatTime(sleepTimerRemaining ?? 0)}
          </Text>
          <View style={styles.flex} />
          <Pressable onPress={onCancelTimer}>
            <Ionicons name="close" size={10} color={`${colors.primaryInk}99`} />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={onTogglePicker}>
          <View style={[styles.chip, { backgroundColor: colors.primarySoft }]}>
            <View style={[styles.moonCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.moonGlyph}>{'\u263E'}</Text>
            </View>
            <Text style={[Fonts.caption2Bold, { color: colors.primaryInk }]}>
              Sleep timer
            </Text>
          </View>
        </Pressable>
      )}

      {showTimerPicker ? (
        <View style={styles.optionsRow}>
          {TIMER_OPTIONS.map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => { if (opt.seconds != null) onStartTimer(opt.seconds) }}
              style={[styles.dayOption, { backgroundColor: colors.surface, borderColor: colors.hair }]}
            >
              <Text style={[Fonts.captionSemiBold, { color: colors.ink }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

/* ─── Night Mode ─── */
function NightDrawer({
  isSleepTimerActive,
  sleepTimerRemaining,
  showTimerPicker,
  onTogglePicker,
  onStartTimer,
  onCancelTimer,
  colors,
}: Omit<SleepTimerProps, 'isNight'>) {
  return (
    <View style={[styles.nightDrawer, { borderColor: colors.nightHair }]}>
      <View style={styles.nightHeader}>
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.nightBadge}
        >
          <Text style={styles.nightBadgeText}>{'\u263E'}</Text>
        </LinearGradient>
        <View style={styles.flex}>
          <Text style={[styles.nightLabel, { color: colors.nightInkSoft }]}>
            SLEEP TIMER
          </Text>
          <Text style={[styles.nightStatus, { color: colors.nightInk }]}>
            {isSleepTimerActive
              ? `Fade out in ${formatTime(sleepTimerRemaining ?? 0)}`
              : 'Tap edit to set a timer'}
          </Text>
        </View>
        <Pressable
          onPress={isSleepTimerActive ? onCancelTimer : onTogglePicker}
          style={styles.nightEdit}
        >
          <Text style={[styles.nightEditText, { color: colors.nightInk }]}>
            {isSleepTimerActive ? 'Cancel' : 'Edit'}
          </Text>
        </Pressable>
      </View>
      {showTimerPicker ? (
        <View style={styles.optionsRow}>
          {TIMER_OPTIONS.map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => { if (opt.seconds != null) onStartTimer(opt.seconds) }}
              style={[styles.nightOption, { borderColor: colors.nightHair }]}
            >
              <Text style={[Fonts.captionSemiBold, { color: colors.nightInk }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: Spacing.sm },
  flex: { flex: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  moonCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonGlyph: { fontSize: 11, fontWeight: '600', color: '#FFFFFF' },
  optionsRow: { flexDirection: 'row', gap: 8 },
  dayOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  nightDrawer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: Spacing.md,
  },
  nightHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nightBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nightBadgeText: { fontSize: 14, color: '#FFFFFF' },
  nightLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 1.4,
  },
  nightStatus: {
    fontSize: 16,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
  },
  nightEdit: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  nightEditText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Nunito_700Bold',
  },
  nightOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
})
