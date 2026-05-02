import React, { useState, useCallback, useEffect } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  BackHandler,
  useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { WaveformScrubber } from '@/components/WaveformScrubber'
import { PlayPauseButton, SeekButton } from '@/components/PlayerControls'
import { SleepTimerSection } from '@/components/SleepTimer'
import { CoverScene } from '@/components/CoverScene'
import { DreamingMoon } from '@/components/DreamingMoon'
import { SnoozyStar } from '@/components/SnoozyStar'

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

export function StoryPlayerScreen() {
  const { colors, isDark } = useThemeColors()
  const { width: screenWidth } = useWindowDimensions()
  const isNight = isDark

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

  useEffect(() => {
    return () => { stopPlayback() }
  }, [stopPlayback])

  useEffect(() => {
    const handleBackPress = () => { stopPlayback(); return true }
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackPress)
    return () => sub.remove()
  }, [stopPlayback])

  const progressFraction = duration > 0 ? currentTime / duration : 0
  const waveformWidth = screenWidth - 48

  const handleWaveformSeek = useCallback(
    (fraction: number) => { if (duration > 0) seek(fraction * duration) },
    [duration, seek]
  )

  const handleSeekBack = () => seek(Math.max(0, currentTime - 15))
  const handleSeekForward = () => seek(Math.min(duration, currentTime + 15))

  if (!currentStory) return null

  const isSleepTimerActive = sleepTimerRemaining !== null
  const bgColor = isNight ? colors.night : colors.background
  const inkColor = isNight ? colors.nightInk : colors.ink
  const softColor = isNight ? colors.nightInkSoft : colors.inkSoft
  const headerBg = isNight ? 'rgba(255,255,255,0.08)' : colors.surface
  const headerBorder = isNight ? colors.nightHair : colors.hair

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      {isNight ? <NightBackground colors={colors} screenWidth={screenWidth} /> : null}

      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={stopPlayback}
          style={[styles.headerButton, { backgroundColor: headerBg, borderColor: headerBorder }]}
        >
          <Ionicons name="close" size={16} color={inkColor} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={[Fonts.eyebrow, { color: softColor, textAlign: 'center' }]}>
            {isNight ? 'DREAMING' : 'NOW PLAYING'}
          </Text>
        </View>
        <Pressable
          style={[styles.headerButton, { backgroundColor: headerBg, borderColor: headerBorder }]}
        >
          <Ionicons name="heart-outline" size={16} color={inkColor} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        {isNight ? (
          <View style={styles.nightHero}><DreamingMoon size={196} /></View>
        ) : (
          <CoverScene />
        )}

        {/* Title */}
        <Text style={[Fonts.serifHeadline, { color: inkColor, textAlign: 'center', fontSize: 26 }]}>
          {currentStory.title}
        </Text>

        {/* Waveform */}
        <View style={styles.waveformContainer}>
          <WaveformScrubber
            progress={progressFraction}
            onSeek={handleWaveformSeek}
            isNight={isNight}
            containerWidth={waveformWidth}
          />
        </View>

        {/* Time */}
        <View style={styles.timeRow}>
          <Text style={[Fonts.mono, { color: softColor }]}>{formatTime(currentTime)}</Text>
          <Text style={[Fonts.mono, { color: softColor }]}>
            {isNight ? `-${formatTime(Math.max(0, duration - currentTime))}` : formatTime(duration)}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <SeekButton label={'\u221215'} onPress={handleSeekBack} isNight={isNight} colors={colors} />
          <PlayPauseButton isPlaying={isPlaying} isNight={isNight} onPress={togglePlayPause} colors={colors} />
          <SeekButton label="+15" onPress={handleSeekForward} isNight={isNight} colors={colors} />
        </View>

        {/* Sleep timer */}
        <SleepTimerSection
          isNight={isNight}
          isSleepTimerActive={isSleepTimerActive}
          sleepTimerRemaining={sleepTimerRemaining}
          showTimerPicker={showTimerPicker}
          onTogglePicker={() => setShowTimerPicker((v) => !v)}
          onStartTimer={(seconds) => { startSleepTimer(seconds); setShowTimerPicker(false) }}
          onCancelTimer={cancelSleepTimer}
          colors={colors}
        />

        {/* Story text */}
        <Text style={[Fonts.serifBodyRegular, { color: inkColor, lineHeight: 26 }]}>
          {currentStory.storyText}
        </Text>
      </ScrollView>
    </View>
  )
}

/** Night mode ambient background with gradient, glow circles, and stars. */
function NightBackground({
  colors,
  screenWidth,
}: {
  colors: ReturnType<typeof useThemeColors>['colors']
  screenWidth: number
}) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[colors.night, colors.nightDeep]} style={StyleSheet.absoluteFill} />
      <View style={[styles.glowCircle, styles.glow1, { backgroundColor: `${colors.primary}59` }]} />
      <View style={[styles.glowCircle, styles.glow2, { backgroundColor: `${colors.accent}38` }]} />
      {Array.from({ length: 32 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.nightStar,
            { transform: [
              { translateX: (i * 53 + 17) % screenWidth },
              { translateY: (i * 37 + 11) % 600 },
            ] },
          ]}
        >
          <SnoozyStar
            size={(1 + (i % 4) * 0.6) * 2}
            color={colors.nightInk}
            opacity={0.3 + (i % 5) * 0.12}
          />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: Spacing.lg },
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  nightHero: { alignItems: 'center', paddingVertical: Spacing.md },
  waveformContainer: { width: '100%' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  glowCircle: { position: 'absolute', borderRadius: 999 },
  glow1: { width: 260, height: 260, left: -140, top: -300 },
  glow2: { width: 300, height: 300, right: -150, top: -180 },
  nightStar: { position: 'absolute' },
})
