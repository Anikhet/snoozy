import React, { useEffect, useMemo, useState } from 'react'
import {
  BackHandler,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors, Spacing, Radii } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { TIMER_OPTIONS } from '@/services/audioService'
import { WaveformScrubber } from '@/components/Visuals'
import { StoryCoverTile } from '@/components/StoryCoverTile'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const COVER_HEIGHT = Math.round(SCREEN_HEIGHT * 0.38)
const CARD_TOP_RADIUS = 28

const colors = Colors.light

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  return `${mins} min`
}

export function StoryPlayerScreen() {
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
  const ambientVolume = useStoryStore((s) => s.ambientVolume)
  const setAmbientVolume = useStoryStore((s) => s.setAmbientVolume)
  const toggleFavorite = useStoryStore((s) => s.toggleFavorite)

  const insets = useSafeAreaInsets()

  const [showTimerPicker, setShowTimerPicker] = useState(false)
  const [showText, setShowText] = useState(false)
  const [barWidth, setBarWidth] = useState(0)
  const [ambientBarWidth, setAmbientBarWidth] = useState(0)

  const playScale = useSharedValue(1)

  // Pause audio when navigating away from the player screen
  useEffect(() => {
    return () => {
      if (useStoryStore.getState().isPlaying) {
        useStoryStore.getState().togglePlayPause()
      }
    }
  }, [])

  // Back-button handling (Android)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      stopPlayback()
      return true
    })
    return () => sub.remove()
  }, [stopPlayback])

  const progress = duration > 0 ? currentTime / duration : 0
  const isSleepTimerActive = sleepTimerRemaining !== null

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onChange((e) => {
          if (barWidth <= 0 || duration <= 0) return
          seek(Math.max(0, Math.min(1, e.x / barWidth)) * duration)
        })
        .runOnJS(true),
    [barWidth, duration, seek],
  )

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .onEnd((e) => {
          if (barWidth <= 0 || duration <= 0) return
          seek(Math.max(0, Math.min(1, e.x / barWidth)) * duration)
        })
        .runOnJS(true),
    [barWidth, duration, seek],
  )

  const composedGesture = useMemo(
    () => Gesture.Race(panGesture, tapGesture),
    [panGesture, tapGesture],
  )

  const ambientPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .onChange((e) => {
          if (ambientBarWidth <= 0) return
          setAmbientVolume(Math.max(0, Math.min(1, e.x / ambientBarWidth)))
        })
        .runOnJS(true),
    [ambientBarWidth, setAmbientVolume],
  )

  const ambientTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .onEnd((e) => {
          if (ambientBarWidth <= 0) return
          setAmbientVolume(Math.max(0, Math.min(1, e.x / ambientBarWidth)))
        })
        .runOnJS(true),
    [ambientBarWidth, setAmbientVolume],
  )

  const ambientComposedGesture = useMemo(
    () => Gesture.Race(ambientPanGesture, ambientTapGesture),
    [ambientPanGesture, ambientTapGesture],
  )

  const playBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playScale.value }],
  }))

  function handlePlayPress() {
    playScale.value = withSpring(0.92, { damping: 12 }, () => {
      playScale.value = withSpring(1)
    })
    togglePlayPause()
  }

  if (!currentStory) return null

  const storyPreview =
    !showText && currentStory.storyText.length > 0
      ? currentStory.storyText.replace(/\n+/g, ' ').trim().substring(0, 140)
      : null

  return (
    <View style={styles.root}>
      {/* Full-bleed cover image fills the top portion */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.coverContainer}>
        <StoryCoverTile
          title={currentStory.title}
          worldId={currentStory.templateId}
          size="hero"
          borderRadius={0}
          showTitle={false}
          resizeMode="cover"
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Bottom card overlaps the image with rounded top corners */}
      <View
        style={[
          styles.card,
          { paddingBottom: Math.max(insets.bottom, Spacing.md) },
        ]}
      >

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.playerContent}
        >
          {/* Story title */}
          <Animated.View entering={FadeInUp.delay(150).duration(400)}>
            <Text style={styles.storyTitle} numberOfLines={2}>
              {currentStory.title}
            </Text>
          </Animated.View>

          {/* Duration + voice name */}
          <Animated.View entering={FadeInUp.delay(180).duration(400)} style={styles.durationRow}>
            {duration > 0 ? (
              <>
                <Ionicons name="time-outline" size={12} color={colors.inkMute as string} />
                <Text style={styles.durationText}>{formatDuration(duration)}</Text>
              </>
            ) : null}
            {currentStory.voiceName ? (
              <>
                {duration > 0 && <Text style={styles.durationText}> · </Text>}
                <Ionicons name="mic-outline" size={12} color={colors.inkMute as string} />
                <Text style={styles.durationText}>{currentStory.voiceName}</Text>
              </>
            ) : null}
          </Animated.View>

          {/* Waveform scrubber */}
          <Animated.View entering={FadeInUp.delay(260).duration(400)} style={styles.scrubberBlock}>
            <GestureDetector gesture={composedGesture}>
              <View
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
                style={styles.scrubberHit}
              >
                <WaveformScrubber
                  progress={progress}
                  bars={56}
                  activeColor={colors.primary}
                  inactiveColor={colors.primarySoft}
                  height={36}
                />
              </View>
            </GestureDetector>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeText}>
                {duration > 0 ? formatTime(duration) : '–:––'}
              </Text>
            </View>
          </Animated.View>

          {/* Playback controls */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.controls}>
            <Pressable
              style={styles.seekCircle}
              onPress={() => seek(Math.max(0, currentTime - 15))}
              accessibilityRole="button"
              accessibilityLabel="Skip back 15 seconds"
            >
              <Ionicons name="play-back" size={18} color={colors.ink} />
              <Text style={styles.seekNumber}>15</Text>
            </Pressable>

            <Animated.View style={playBtnStyle} shouldRasterizeIOS renderToHardwareTextureAndroid>
              <Pressable
                style={styles.playBtn}
                onPress={handlePlayPress}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={30}
                  color="#FFFFFF"
                />
              </Pressable>
            </Animated.View>

            <Pressable
              style={styles.seekCircle}
              onPress={() => seek(Math.min(duration, currentTime + 15))}
              accessibilityRole="button"
              accessibilityLabel="Skip forward 15 seconds"
            >
              <Ionicons name="play-forward" size={18} color={colors.ink} />
              <Text style={styles.seekNumber}>15</Text>
            </Pressable>
          </Animated.View>

          {/* Sleep timer */}
          <Animated.View entering={FadeInUp.delay(340).duration(400)} style={styles.sleepRow}>
            <Pressable
              style={[styles.sleepChip, isSleepTimerActive && styles.sleepChipActive]}
              onPress={() => setShowTimerPicker((v) => !v)}
              accessibilityRole="button"
            >
              <Ionicons
                name="moon-outline"
                size={14}
                color={isSleepTimerActive ? colors.gold : (colors.inkMute as string)}
              />
              <Text style={[styles.sleepLabel, isSleepTimerActive && { color: colors.gold }]}>
                {isSleepTimerActive
                  ? `Sleep in ${formatTime(sleepTimerRemaining ?? 0)}`
                  : 'Sleep timer'}
              </Text>
              {isSleepTimerActive ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation()
                    cancelSleepTimer()
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={14} color={colors.inkMute as string} />
                </Pressable>
              ) : null}
            </Pressable>

            {showTimerPicker ? (
              <View style={styles.timerOptions}>
                {TIMER_OPTIONS.map((option) => (
                  <Pressable
                    key={option.label}
                    style={styles.timerOption}
                    onPress={() => {
                      startSleepTimer(option.seconds)
                      setShowTimerPicker(false)
                    }}
                  >
                    <Text style={styles.timerOptionText}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Animated.View>

          {/* Ambient volume mixer */}
          <Animated.View entering={FadeInUp.delay(370).duration(400)} style={styles.ambientRow}>
            <Ionicons name="volume-medium" size={14} color={colors.inkMute as string} />
            <GestureDetector gesture={ambientComposedGesture}>
              <View
                style={styles.ambientTrackHit}
                onLayout={(e) => setAmbientBarWidth(e.nativeEvent.layout.width)}
              >
                <View style={styles.ambientTrack}>
                  <View style={[styles.ambientFill, { width: `${ambientVolume * 100}%` }]} />
                  <View
                    style={[
                      styles.ambientThumb,
                      { left: `${ambientVolume * 100}%` },
                    ]}
                  />
                </View>
              </View>
            </GestureDetector>
            <Text style={styles.ambientLabel}>
              {Math.round(ambientVolume * 100)}%
            </Text>
          </Animated.View>

          {/* Two-line story preview */}
          {storyPreview ? (
            <Animated.Text
              entering={FadeInUp.delay(210).duration(400)}
              style={styles.storyPreview}
              numberOfLines={2}
            >
              {storyPreview}
            </Animated.Text>
          ) : null}

          {/* Read-along toggle */}
          {currentStory.storyText.length > 0 ? (
            <Pressable style={styles.readAlongBtn} onPress={() => setShowText((v) => !v)}>
              <Ionicons
                name={showText ? 'book' : 'book-outline'}
                size={13}
                color={colors.primary}
              />
              <Text style={styles.readAlongLabel}>
                {showText ? 'Hide text' : 'Read along'}
              </Text>
            </Pressable>
          ) : null}

          {showText ? (
            <Animated.View entering={FadeInUp.duration(300)} style={styles.storyTextCard}>
              <ScrollView
                style={styles.storyTextScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.storyTextBody}>{currentStory.rawText ?? currentStory.storyText}</Text>
              </ScrollView>
            </Animated.View>
          ) : null}
        </ScrollView>
      </View>

      {/* Glass controls float over the image, respecting safe area */}
      <Animated.View
        entering={FadeIn.delay(200).duration(400)}
        style={[styles.topBar, { top: insets.top + Spacing.sm }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.glassBtn}
          onPress={stopPlayback}
          accessibilityRole="button"
          accessibilityLabel="Close player"
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </Pressable>
        <View style={styles.topRight}>
          <Pressable
            style={styles.glassBtn}
            onPress={() => toggleFavorite(currentStory.id)}
            accessibilityRole="button"
            accessibilityLabel={currentStory.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons
              name={currentStory.isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={currentStory.isFavorite ? colors.heart : '#FFFFFF'}
            />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  coverContainer: {
    height: COVER_HEIGHT,
    width: SCREEN_WIDTH,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    marginTop: -CARD_TOP_RADIUS,
    backgroundColor: colors.background,
    borderTopLeftRadius: CARD_TOP_RADIUS,
    borderTopRightRadius: CARD_TOP_RADIUS,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  topRight: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  storyTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
    letterSpacing: -0.3,
    color: colors.ink,
    marginBottom: Spacing.xs,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  durationText: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 12,
    color: colors.inkMute as string,
  },
  storyPreview: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
    marginBottom: Spacing.sm,
  },
  readAlongBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  readAlongLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.primary,
  },
  storyTextCard: {
    backgroundColor: colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: colors.hair,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  storyTextScroll: {
    height: 140,
  },
  storyTextBody: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkSoft,
  },
  scrubberBlock: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  scrubberHit: {
    width: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 0.4,
    color: colors.inkMute as string,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginVertical: Spacing.sm,
  },
  seekCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.hair,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  seekNumber: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 9,
    color: colors.inkSoft,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sleepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 50,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hair,
  },
  sleepChipActive: {
    borderColor: colors.gold,
    backgroundColor: '#FFF8E0',
  },
  sleepLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.inkMute as string,
  },
  timerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  timerOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.hair,
    backgroundColor: colors.surface,
  },
  timerOptionText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.ink,
  },
  ambientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  ambientTrackHit: {
    flex: 1,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
  },
  ambientTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.hair,
    position: 'relative',
    justifyContent: 'center',
  },
  ambientFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  ambientThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    marginLeft: -7,
    top: -5,
  },
  ambientLabel: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 11,
    color: colors.inkMute as string,
    width: 30,
    textAlign: 'right',
  },
})
