import React, { useEffect, useMemo, useState } from 'react'
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Night, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { TIMER_OPTIONS } from '@/services/audioService'
import {
  CoverScene,
  DreamingMoon,
  SnoozyStar,
  WaveformScrubber,
} from '@/components/Visuals'

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

/** Ambient light mode → cover scene hero, lavender wave.
 *  Dreaming dark mode → night moon hero, glass sleep-timer drawer. */
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

  useEffect(() => () => stopPlayback(), [stopPlayback])

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      stopPlayback()
      return true
    })
    return () => sub.remove()
  }, [stopPlayback])

  const progress = duration > 0 ? currentTime / duration : 0

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onChange((e) => {
          if (barWidth <= 0 || duration <= 0) return
          const f = Math.max(0, Math.min(1, e.x / barWidth))
          seek(f * duration)
        })
        .runOnJS(true),
    [barWidth, duration, seek],
  )

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .onEnd((e) => {
          if (barWidth <= 0 || duration <= 0) return
          const f = Math.max(0, Math.min(1, e.x / barWidth))
          seek(f * duration)
        })
        .runOnJS(true),
    [barWidth, duration, seek],
  )

  const composedGesture = useMemo(
    () => Gesture.Race(panGesture, tapGesture),
    [panGesture, tapGesture],
  )

  if (!currentStory) return null

  const ink = isDark ? Night.ink : colors.ink
  const inkSoft = isDark ? Night.inkSoft : colors.inkSoft
  const isSleepTimerActive = sleepTimerRemaining !== null

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? Night.bg : colors.background }}>
      {isDark ? <NightBackdrop /> : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <HeaderBtn isDark={isDark} color={ink} onPress={stopPlayback}>
            <Ionicons name="close" size={14} color={ink} />
          </HeaderBtn>
          <Text style={[Fonts.eyebrow, { color: inkSoft }]}>
            {isDark ? 'DREAMING' : 'NOW PLAYING'}
          </Text>
          <HeaderBtn isDark={isDark} color={ink} onPress={() => {}}>
            <Ionicons name="heart-outline" size={14} color={ink} />
          </HeaderBtn>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          {isDark ? (
            <View style={{ alignItems: 'center', paddingTop: 20 }}>
              <DreamingMoon size={196} />
            </View>
          ) : (
            <CoverScene height={280} />
          )}
        </View>

        {/* Title */}
        <View style={styles.title}>
          <Text style={[Fonts.eyebrow, { color: inkSoft, textAlign: 'center' }]}>
            {(isDark ? 'A CHAPTER FOR ' : 'A STORY FOR ') +
              currentStory.childName.toUpperCase()}
          </Text>
          <Text
            style={[
              styles.titleText,
              { color: ink, fontFamily: 'Fraunces_500Medium_Italic' },
            ]}
            numberOfLines={2}
          >
            {currentStory.title}
          </Text>
        </View>

        {/* Scrubber */}
        <View style={styles.scrubberBlock}>
          <GestureDetector gesture={composedGesture}>
            <View
              onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
              style={{ width: '100%' }}
            >
              <WaveformScrubber
                progress={progress}
                bars={isDark ? 56 : 48}
                activeColor={isDark ? Night.ink : colors.primary}
                inactiveColor={
                  isDark ? 'rgba(242,237,227,0.22)' : 'rgba(43,33,48,0.14)'
                }
                height={38}
              />
            </View>
          </GestureDetector>
          <View style={styles.timeRow}>
            <Text style={[Fonts.mono, { color: inkSoft }]}>{formatTime(currentTime)}</Text>
            <Text style={[Fonts.mono, { color: inkSoft }]}>
              {isDark ? `-${formatTime(Math.max(0, duration - currentTime))}` : formatTime(duration)}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <SeekBtn label="−15" onPress={() => seek(Math.max(0, currentTime - 15))} isDark={isDark} color={ink} />
          <Pressable onPress={togglePlayPause}>
            {isDark ? (
              <LinearGradient
                colors={['#F9F2E4', colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.playBtn, { shadowColor: colors.accent, shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 14 }]}
              >
                <PlayGlyph color={Night.bg} playing={isPlaying} />
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={[colors.ink, '#3D3142']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.playBtn, { shadowColor: colors.ink, shadowOpacity: 0.32, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 12 }]}
              >
                <PlayGlyph color={colors.background} playing={isPlaying} />
              </LinearGradient>
            )}
          </Pressable>
          <SeekBtn label="+15" onPress={() => seek(Math.min(duration, currentTime + 15))} isDark={isDark} color={ink} />
        </View>

        {/* Sleep timer */}
        <View style={styles.sleepTimer}>
          {isDark ? (
            <View style={styles.nightDrawer}>
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.drawerBadge}
              >
                <Text style={{ color: '#fff', fontSize: 14 }}>{'\u263E'}</Text>
              </LinearGradient>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[Fonts.eyebrow, { color: Night.inkSoft, fontSize: 10 }]}>
                  SLEEP TIMER
                </Text>
                <Text
                  style={{
                    fontFamily: 'Fraunces_500Medium_Italic',
                    fontSize: 16,
                    color: Night.ink,
                    marginTop: 2,
                  }}
                >
                  {isSleepTimerActive
                    ? `Fade out in ${formatTime(sleepTimerRemaining ?? 0)}`
                    : 'Tap edit to set a timer'}
                </Text>
              </View>
              <Pressable onPress={() => setShowTimerPicker((v) => !v)}>
                <View style={[styles.editChip, { backgroundColor: 'rgba(242,237,227,0.1)' }]}>
                  <Text style={{ color: Night.ink, fontFamily: 'Nunito_700Bold', fontSize: 11 }}>
                    Edit
                  </Text>
                </View>
              </Pressable>
            </View>
          ) : isSleepTimerActive ? (
            <View style={[styles.sleepChip, { backgroundColor: colors.primarySoft }]}>
              <View style={[styles.sleepChipDot, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontSize: 11 }}>{'\u263E'}</Text>
              </View>
              <Text style={{ color: colors.primaryInk, fontFamily: 'Nunito_700Bold', fontSize: 12 }}>
                Sleep timer · {formatTime(sleepTimerRemaining ?? 0)}
              </Text>
              <Pressable onPress={cancelSleepTimer} style={{ marginLeft: 4 }}>
                <Ionicons name="close" size={12} color={colors.primaryInk} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowTimerPicker((v) => !v)}>
              <View style={[styles.sleepChip, { backgroundColor: colors.primarySoft }]}>
                <View style={[styles.sleepChipDot, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#fff', fontSize: 11 }}>{'\u263E'}</Text>
                </View>
                <Text style={{ color: colors.primaryInk, fontFamily: 'Nunito_700Bold', fontSize: 12 }}>
                  Sleep timer
                </Text>
              </View>
            </Pressable>
          )}

          {showTimerPicker ? (
            <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                      {
                        backgroundColor: isDark ? Night.glass : colors.surface,
                        borderColor: isDark ? Night.hair : colors.hair,
                      },
                    ]}
                  >
                    <Text style={{ color: ink, fontFamily: 'Nunito_600SemiBold', fontSize: 12 }}>
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {/* Story text */}
        <Text
          style={{
            color: ink,
            fontFamily: 'Fraunces_400Regular',
            fontSize: 17,
            lineHeight: 26,
            paddingHorizontal: Spacing.lg,
            paddingTop: 28,
            paddingBottom: 40,
          }}
        >
          {currentStory.storyText}
        </Text>
      </ScrollView>
    </View>
  )
}

function NightBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[Night.bg, Night.bgDeep]}
        style={StyleSheet.absoluteFill}
      />
      {/* ambient stars */}
      {Array.from({ length: 32 }).map((_, i) => {
        const x = ((i * 53 + 17) % 340)
        const y = ((i * 37 + 11) % 800)
        const s = 1 + (i % 4) * 0.6
        return (
          <View key={i} style={{ position: 'absolute', left: x, top: y }}>
            <SnoozyStar size={s * 2} color="#fff" opacity={0.3 + (i % 5) * 0.12} />
          </View>
        )
      })}
      {/* distant glows */}
      <View
        style={{
          position: 'absolute',
          left: -80,
          top: -80,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: 'rgba(91,91,214,0.35)',
          opacity: 0.6,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -100,
          top: 100,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(233,169,122,0.22)',
          opacity: 0.6,
        }}
      />
    </View>
  )
}

function HeaderBtn({
  children,
  isDark,
  color,
  onPress,
}: {
  children: React.ReactNode
  isDark: boolean
  color: string
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.headerBtn,
          isDark
            ? { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: Night.hair }
            : { backgroundColor: '#FFFFFF', borderColor: 'rgba(43,33,48,0.08)' },
        ]}
      >
        {children}
      </View>
    </Pressable>
  )
}

function SeekBtn({
  label,
  onPress,
  isDark,
  color,
}: {
  label: string
  onPress: () => void
  isDark: boolean
  color: string
}) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.seekBtn,
          isDark
            ? {
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: Night.hair,
                borderWidth: 1,
              }
            : null,
        ]}
      >
        <Text style={{ color, fontFamily: 'monospace', fontSize: 13, fontWeight: '700' }}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

function PlayGlyph({ color, playing }: { color: string; playing: boolean }) {
  if (playing) {
    return (
      <View style={{ flexDirection: 'row', gap: 4 }}>
        <View style={{ width: 5, height: 22, backgroundColor: color, borderRadius: 1.5 }} />
        <View style={{ width: 5, height: 22, backgroundColor: color, borderRadius: 1.5 }} />
      </View>
    )
  }
  // triangle pointing right
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: 11,
        borderBottomWidth: 11,
        borderLeftWidth: 18,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color,
        marginLeft: 4,
      }}
    />
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    gap: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {},
  title: {
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 26,
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  scrubberBlock: {
    gap: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  seekBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepTimer: {
    alignItems: 'center',
  },
  sleepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  sleepChipDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nightDrawer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(242,237,227,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(242,237,227,0.14)',
    width: '100%',
  },
  drawerBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  timerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
})
