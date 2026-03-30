import React, { useState, useCallback } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import { useThemeColors } from '@/hooks/useThemeColors'
import { AppIcon } from '@/components/AppIcon'
import { Fonts, Spacing, Radii, getCardShadow } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { TIMER_OPTIONS } from '@/services/audioService'

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function StoryPlayerScreen() {
  const { colors, isDark } = useThemeColors()
  const currentStory = useStoryStore((s) => s.currentStory)
  const isPlaying = useStoryStore((s) => s.isPlaying)
  const currentTime = useStoryStore((s) => s.currentTime)
  const duration = useStoryStore((s) => s.duration)
  const sleepTimerRemaining = useStoryStore((s) => s.sleepTimerRemaining)
  const togglePlayPause = useStoryStore((s) => s.togglePlayPause)
  const seek = useStoryStore((s) => s.seek)
  const startSleepTimer = useStoryStore((s) => s.startSleepTimer)
  const cancelSleepTimer = useStoryStore((s) => s.cancelSleepTimer)
  const stopPlayback = useStoryStore((s) => s.stopPlayback)

  const [showTimerPicker, setShowTimerPicker] = useState(false)
  const [barWidth, setBarWidth] = useState(0)

  const handleBarLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      setBarWidth(e.nativeEvent.layout.width)
    },
    []
  )

  const progressFraction = duration > 0 ? currentTime / duration : 0

  // Gesture for seeking on the progress bar
  const panGesture = Gesture.Pan()
    .onStart((e) => {
      if (barWidth <= 0 || duration <= 0) return
      const fraction = Math.max(0, Math.min(1, e.x / barWidth))
      seek(fraction * duration)
    })
    .onChange((e) => {
      if (barWidth <= 0 || duration <= 0) return
      const fraction = Math.max(0, Math.min(1, e.x / barWidth))
      seek(fraction * duration)
    })
    .runOnJS(true)

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      if (barWidth <= 0 || duration <= 0) return
      const fraction = Math.max(0, Math.min(1, e.x / barWidth))
      seek(fraction * duration)
    })
    .runOnJS(true)

  const composedGesture = Gesture.Race(panGesture, tapGesture)

  if (!currentStory) return null

  const handleSeekBack = () => seek(Math.max(0, currentTime - 15))
  const handleSeekForward = () => seek(Math.min(duration, currentTime + 15))

  const isSleepTimerActive = sleepTimerRemaining !== null

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <Pressable onPress={stopPlayback}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.flex} />
        </View>

        <Text
          style={[
            Fonts.title,
            { color: colors.textPrimary, textAlign: 'center' },
          ]}
        >
          {currentStory.title}
        </Text>

        <Text
          style={[
            Fonts.caption,
            { color: colors.textSecondary, textAlign: 'center' },
          ]}
        >
          A story for {currentStory.childName}
        </Text>
      </View>

      {/* Player Controls */}
      <View style={styles.controls}>
        <View style={styles.spacerLg} />

        {/* Progress Bar */}
        <GestureDetector gesture={composedGesture}>
          <View
            style={[styles.progressOuter, { backgroundColor: colors.surface }]}
            onLayout={handleBarLayout}
          >
            <View
              style={[
                styles.progressInner,
                {
                  backgroundColor: colors.primary,
                  width: `${progressFraction * 100}%`,
                },
              ]}
            />
          </View>
        </GestureDetector>

        {/* Time Labels */}
        <View style={styles.timeRow}>
          <Text style={[Fonts.caption, { color: colors.textSecondary }]}>
            {formatTime(currentTime)}
          </Text>
          <Text style={[Fonts.caption, { color: colors.textSecondary }]}>
            {formatTime(duration)}
          </Text>
        </View>

        {/* Playback Buttons */}
        <View style={styles.buttonRow}>
          <Pressable onPress={handleSeekBack}>
            <AppIcon name="gobackward.15" size={28} color={colors.textSecondary} />
          </Pressable>

          <Pressable onPress={togglePlayPause}>
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={64}
              color={colors.primary}
            />
          </Pressable>

          <Pressable onPress={handleSeekForward}>
            <AppIcon name="goforward.15" size={28} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.spacerMd} />
      </View>

      {/* Sleep Timer */}
      <View style={styles.sleepTimerSection}>
        {isSleepTimerActive ? (
          <View
            style={[
              styles.sleepTimerActive,
              { backgroundColor: colors.primary + '1A' },
            ]}
          >
            <AppIcon name="moon.zzz.fill" size={12} color={colors.primary} />
            <Text style={[Fonts.caption, { color: colors.primary }]}>
              Sleep in {formatTime(sleepTimerRemaining)}
            </Text>
            <View style={styles.flex} />
            <Pressable onPress={cancelSleepTimer}>
              <Text style={[Fonts.caption, { color: colors.primary }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setShowTimerPicker((v) => !v)}>
            <View style={styles.sleepTimerInactive}>
              <AppIcon name="moon.zzz" size={12} color={colors.textSecondary} />
              <Text style={[Fonts.caption, { color: colors.textSecondary }]}>
                Sleep Timer
              </Text>
            </View>
          </Pressable>
        )}

        {showTimerPicker ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timerOptionsRow}
          >
            {TIMER_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                onPress={() => {
                  startSleepTimer(option.seconds)
                  setShowTimerPicker(false)
                }}
              >
                <View
                  style={[
                    styles.timerOption,
                    { backgroundColor: colors.surface },
                    getCardShadow(isDark),
                  ]}
                >
                  <Text
                    style={[Fonts.caption, { color: colors.textPrimary }]}
                  >
                    {option.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* Story Text */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.storyTextScroll}
      >
        <Text
          style={[
            Fonts.body,
            {
              color: colors.textPrimary,
              lineHeight: 23,
              paddingVertical: Spacing.md,
            },
          ]}
        >
          {currentStory.storyText}
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  headerSection: {
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controls: {
    gap: Spacing.md,
  },
  progressOuter: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressInner: {
    height: 6,
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  sleepTimerSection: {
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  sleepTimerActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.small,
  },
  sleepTimerInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timerOptionsRow: {
    gap: Spacing.sm,
  },
  timerOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.small,
  },
  storyTextScroll: {
    flex: 1,
  },
  spacerLg: {
    height: Spacing.lg,
  },
  spacerMd: {
    height: Spacing.md,
  },
  flex: {
    flex: 1,
  },
})
