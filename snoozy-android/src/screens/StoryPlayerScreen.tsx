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
import { LinearGradient } from 'expo-linear-gradient'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Night, Fonts, Spacing, Radii } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { TIMER_OPTIONS } from '@/services/audioService'
import { WaveformScrubber } from '@/components/Visuals'
import { StoryCoverTile } from '@/components/StoryCoverTile'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const COVER_HEIGHT = SCREEN_HEIGHT * 0.58


function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
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

  const insets = useSafeAreaInsets()
  const [showTimerPicker, setShowTimerPicker] = useState(false)
  const [showText, setShowText] = useState(false)
  const [barWidth, setBarWidth] = useState(0)
  const [isFavorited, setIsFavorited] = useState(false)

  const playScale = useSharedValue(1)

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

  // Gesture for scrubber
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

  return (
    <View style={styles.root}>
      {/* Full-bleed cover art behind dark overlay */}
      <View style={styles.cover} pointerEvents="none">
        <StoryCoverTile
          title={currentStory.title}
          worldId={currentStory.templateId}
          size="hero"
          borderRadius={0}
          style={StyleSheet.absoluteFill}
        />
        {/* Overlay: fade cover into dark player area */}
        <LinearGradient
          colors={['transparent', 'transparent', Night.bg]}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Top controls (absolute, over cover) */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(400)}
        style={[styles.topControls, { paddingTop: Math.max(insets.top, 16) }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.topBtn}
          onPress={stopPlayback}
          accessibilityRole="button"
          accessibilityLabel="Close player"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.topRight}>
          <Pressable
            style={styles.topBtn}
            onPress={() => setIsFavorited((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorited ? '#E9A97A' : '#FFFFFF'}
            />
          </Pressable>
          <Pressable
            style={styles.topBtn}
            onPress={() => {}}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </Animated.View>

      {/* Scrollable player content (starts ~50% down) */}
      <SafeAreaView edges={['top', 'bottom']} style={styles.flex}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Spacer so content starts below the cover */}
          <View style={{ height: COVER_HEIGHT * 0.52 }} />

          {/* Story metadata */}
          <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.metadata}>
            <View style={styles.worldRow}>
              <Ionicons name="globe-outline" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.worldLabel}>
                {currentStory.childName.toUpperCase()}
              </Text>
            </View>
            <Text style={[Fonts.serifTitle, styles.storyTitle]} numberOfLines={2}>
              {currentStory.title}
            </Text>
            {duration > 0 ? (
              <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={styles.durationText}>{formatTime(duration)}</Text>
              </View>
            ) : null}
          </Animated.View>

          {/* Read-along toggle */}
          <View style={styles.textToggleRow}>
            <Pressable
              style={styles.textToggleBtn}
              onPress={() => setShowText((v) => !v)}
            >
              <Text style={styles.textToggleLabel}>
                {showText ? 'Hide text' : '📖  Read along'}
              </Text>
            </Pressable>
          </View>

          {showText ? (
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={styles.storyTextCard}
            >
              <ScrollView
                style={styles.storyTextScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.storyTextBody}>{currentStory.storyText}</Text>
              </ScrollView>
            </Animated.View>
          ) : null}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Progress / Scrubber */}
          <Animated.View
            entering={FadeInUp.delay(450).duration(500)}
            style={styles.scrubberBlock}
          >
            <GestureDetector gesture={composedGesture}>
              <View
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
                style={styles.scrubberHit}
              >
                <WaveformScrubber
                  progress={progress}
                  bars={56}
                  activeColor={Night.ink}
                  inactiveColor="rgba(242,237,227,0.22)"
                  height={38}
                />
              </View>
            </GestureDetector>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.timeText}>
                -{formatTime(Math.max(0, duration - currentTime))}
              </Text>
            </View>
          </Animated.View>

          {/* Playback controls */}
          <Animated.View
            entering={FadeInUp.delay(450).duration(500)}
            style={styles.controls}
          >
            <Pressable
              style={styles.seekBtn}
              onPress={() => seek(Math.max(0, currentTime - 15))}
              accessibilityRole="button"
              accessibilityLabel="Skip back 15 seconds"
            >
              <Ionicons name="play-skip-back" size={28} color="rgba(255,255,255,0.8)" />
              <Text style={styles.seekLabel}>15</Text>
            </Pressable>

            <Animated.View style={playBtnStyle} shouldRasterizeIOS renderToHardwareTextureAndroid>
              <Pressable
                style={styles.playBtn}
                onPress={handlePlayPress}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              >
                <LinearGradient
                  colors={[Night.ink, '#E9A97A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.playBtnGradient}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={32}
                    color={Night.bg}
                  />
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Pressable
              style={styles.seekBtn}
              onPress={() => seek(Math.min(duration, currentTime + 15))}
              accessibilityRole="button"
              accessibilityLabel="Skip forward 15 seconds"
            >
              <Ionicons name="play-skip-forward" size={28} color="rgba(255,255,255,0.8)" />
              <Text style={styles.seekLabel}>15</Text>
            </Pressable>
          </Animated.View>

          {/* Sleep timer */}
          <View style={styles.sleepRow}>
            <Pressable
              style={styles.sleepChip}
              onPress={() => setShowTimerPicker((v) => !v)}
              accessibilityRole="button"
            >
              <Ionicons
                name="moon-outline"
                size={16}
                color={isSleepTimerActive ? '#F5C842' : 'rgba(255,255,255,0.5)'}
              />
              <Text
                style={[
                  styles.sleepLabel,
                  isSleepTimerActive && { color: '#F5C842' },
                ]}
              >
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
                  <Ionicons name="close-circle" size={14} color="rgba(255,255,255,0.5)" />
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
          </View>

          <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Night.bg,
  },
  flex: {
    flex: 1,
  },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: COVER_HEIGHT,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 16,
  },
  topRight: {
    flexDirection: 'row',
    gap: 12,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  metadata: {
    gap: 6,
    paddingTop: Spacing.md,
  },
  worldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  worldLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.6)',
  },
  storyTitle: {
    color: Night.ink,
    fontSize: 30,
    letterSpacing: -0.6,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  textToggleRow: {
    marginTop: Spacing.md,
  },
  textToggleBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textToggleLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: Night.ink,
  },
  storyTextCard: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radii.card,
    padding: 16,
  },
  storyTextScroll: {
    height: 200,
  },
  storyTextBody: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 17,
    lineHeight: 28,
    color: 'rgba(242,237,227,0.85)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: Spacing.lg,
  },
  scrubberBlock: {
    gap: 8,
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
    color: 'rgba(242,237,227,0.7)',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginTop: Spacing.xl,
  },
  seekBtn: {
    alignItems: 'center',
    gap: 4,
  },
  seekLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
  },
  playBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepRow: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  sleepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  sleepLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  timerOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  timerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: Night.hair,
    backgroundColor: Night.glass,
  },
  timerOptionText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: Night.ink,
  },
})
