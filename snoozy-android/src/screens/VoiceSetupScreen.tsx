import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useAudioRecorder, AudioModule, RecordingPresets, createAudioPlayer, type AudioStatus } from 'expo-audio'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@clerk/clerk-expo'
import { Fonts, Radii, Sizing, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useBackHandler } from '@/hooks/useBackHandler'
import { BackSwipeZone } from '@/components/BackSwipeZone'
import { CHILD_PROFILE_KEY } from '@/screens/ChildProfileScreen'
import * as apiService from '@/services/apiService'

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'recording' | 'reviewing' | 'uploading' | 'success' | 'has_clone'

const MIN_RECORD_SECONDS = 10
const REC_TIPS = [
  { icon: 'location-outline' as const, text: 'Find a quiet spot away from background noise' },
  { icon: 'mic-outline' as const, text: 'Speak naturally — your normal storytelling voice is perfect' },
  { icon: 'book-outline' as const, text: 'Read anything aloud: a poem, a page, or just say hello' },
]

// ─── VoiceSetupScreen ────────────────────────────────────────────────────────

export function VoiceSetupScreen() {
  const { colors } = useThemeColors()
  const { getToken } = useAuth()
  const closeProfilePanel = useStoryStore((s) => s.closeProfilePanel)
  const childDetails = useStoryStore((s) => s.childDetails)
  const setFishVoiceModelId = useStoryStore((s) => s.setFishVoiceModelId)

  const existingModelId = childDetails.fishVoiceModelId
  const [phase, setPhase] = useState<Phase>(existingModelId ? 'has_clone' : 'idle')
  const [recordingUri, setRecordingUri] = useState<string | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previewPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null)

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)

  useBackHandler(phase === 'recording' ? () => {} : closeProfilePanel)

  // ── Pulse animation for recording indicator ─────────────────────────────
  const pulse = useSharedValue(1)
  useEffect(() => {
    if (phase === 'recording') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 700 }),
          withTiming(1.0, { duration: 700 }),
        ),
        -1,
      )
    } else {
      pulse.value = withTiming(1, { duration: 200 })
    }
  }, [phase, pulse])

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: 0.35 + 0.65 / pulse.value,
  }))

  // ── Timer tick while recording ──────────────────────────────────────────
  useEffect(() => {
    if (phase === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase])

  // ── Cleanup preview player on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      previewPlayerRef.current?.remove()
      previewPlayerRef.current = null
    }
  }, [])

  // ── Recording actions ───────────────────────────────────────────────────

  const handleStartRecording = useCallback(async () => {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync()
    if (!granted) {
      Alert.alert(
        'Microphone access needed',
        'Please allow microphone access in Settings to record your voice.',
        [{ text: 'OK' }],
      )
      return
    }
    try {
      await recorder.prepareToRecordAsync()
      recorder.record()
      setRecordingSeconds(0)
      setPhase('recording')
    } catch {
      Alert.alert('Could not start recording', 'Please try again.')
    }
  }, [recorder])

  const handleStopRecording = useCallback(async () => {
    if (recordingSeconds < MIN_RECORD_SECONDS) return
    try {
      await recorder.stop()
      const uri = recorder.uri
      if (!uri) throw new Error('No recording URI')
      previewPlayerRef.current?.remove()
      previewPlayerRef.current = null
      setRecordingUri(uri)
      setIsPreviewPlaying(false)
      setPhase('reviewing')
    } catch {
      Alert.alert('Recording error', 'Something went wrong. Please try again.')
      setPhase('idle')
    }
  }, [recorder, recordingSeconds])

  const handleReRecord = useCallback(() => {
    previewPlayerRef.current?.remove()
    previewPlayerRef.current = null
    setRecordingUri(null)
    setRecordingSeconds(0)
    setIsPreviewPlaying(false)
    setUploadError(null)
    setPhase('idle')
  }, [])

  // ── Preview playback ────────────────────────────────────────────────────

  const handleTogglePreview = useCallback(() => {
    if (!recordingUri) return

    if (!previewPlayerRef.current) {
      const player = createAudioPlayer({ uri: recordingUri })
      let wasPlaying = false
      player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (wasPlaying && !status.playing && status.currentTime >= status.duration - 0.5) {
          setIsPreviewPlaying(false)
        }
        wasPlaying = status.playing
      })
      previewPlayerRef.current = player
      player.play()
      setIsPreviewPlaying(true)
      return
    }

    if (isPreviewPlaying) {
      previewPlayerRef.current.pause()
      setIsPreviewPlaying(false)
    } else {
      previewPlayerRef.current.play()
      setIsPreviewPlaying(true)
    }
  }, [recordingUri, isPreviewPlaying])

  // ── Upload ──────────────────────────────────────────────────────────────

  const handleUseThisVoice = useCallback(async () => {
    if (!recordingUri) return
    setUploadError(null)
    setPhase('uploading')

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const voiceName = childDetails.name ? `${childDetails.name}'s Voice` : 'My Voice'
      const modelId = await apiService.createVoiceClone(recordingUri, voiceName, token)

      setFishVoiceModelId(modelId)

      const raw = await AsyncStorage.getItem(CHILD_PROFILE_KEY)
      const profile = raw ? JSON.parse(raw) : {}
      await AsyncStorage.setItem(
        CHILD_PROFILE_KEY,
        JSON.stringify({ ...profile, fishVoiceModelId: modelId, voiceId: modelId }),
      )

      setPhase('success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.'
      setUploadError(msg)
      setPhase('reviewing')
    }
  }, [recordingUri, getToken, childDetails.name, setFishVoiceModelId])

  // ── Remove clone ────────────────────────────────────────────────────────

  const handleRemoveVoice = useCallback(() => {
    Alert.alert(
      'Remove your voice?',
      'Stories will use a default narrator voice instead. You can re-record at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken()
              if (token && existingModelId) {
                await apiService.deleteVoiceClone(existingModelId, token).catch(() => {})
              }
            } finally {
              setFishVoiceModelId(null)
              const raw = await AsyncStorage.getItem(CHILD_PROFILE_KEY)
              const profile = raw ? JSON.parse(raw) : {}
              delete profile.fishVoiceModelId
              await AsyncStorage.setItem(CHILD_PROFILE_KEY, JSON.stringify(profile))
              setPhase('idle')
            }
          },
        },
      ],
    )
  }, [existingModelId, getToken, setFishVoiceModelId])

  // ── Hero content by phase ───────────────────────────────────────────────

  const heroContent = (() => {
    switch (phase) {
      case 'idle':
        return { emoji: '🎙️', title: 'Your narrator voice', sub: 'Record yourself for 15–30 seconds and every story will be told in your voice.' }
      case 'recording':
        return { emoji: '🔴', title: 'Recording…', sub: recordingSeconds < MIN_RECORD_SECONDS ? `Keep going — ${MIN_RECORD_SECONDS - recordingSeconds}s more` : "Tap stop whenever you're ready" }
      case 'reviewing':
        return { emoji: '🎧', title: 'How does it sound?', sub: "Play it back, then decide if you'd like to use it." }
      case 'uploading':
        return { emoji: '✨', title: 'Setting up your voice…', sub: 'This takes just a moment.' }
      case 'success':
        return { emoji: '🌟', title: 'Your voice is ready!', sub: 'Generate a new story to hear it for the first time.' }
      case 'has_clone':
        return { emoji: '🎙️', title: 'Your narrator voice', sub: 'Stories are narrated in your voice.' }
    }
  })()

  // ── Format timer ────────────────────────────────────────────────────────

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BackSwipeZone onBack={phase === 'recording' ? () => {} : closeProfilePanel} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingBottom: phase === 'recording' ? Spacing.xxl : Sizing.buttonHeight + Spacing.xl * 2 }]}
        >
          {/* Hero */}
          <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.hero}>
            <Text style={styles.heroEmoji}>{heroContent.emoji}</Text>
            <Text style={styles.heroTitle}>{heroContent.title}</Text>
            <Text style={styles.heroSub}>{heroContent.sub}</Text>
          </Animated.View>

          {/* ── IDLE: tips + big record button ── */}
          {phase === 'idle' && (
            <Animated.View entering={FadeInDown.delay(160).duration(420)} style={[styles.card, { backgroundColor: colors.surface }]}>
              {REC_TIPS.map((tip, i) => (
                <React.Fragment key={tip.text}>
                  <View style={styles.tipRow}>
                    <View style={styles.tipIconWrap}>
                      <Ionicons name={tip.icon} size={18} color="#7B5EA7" />
                    </View>
                    <Text style={styles.tipText}>{tip.text}</Text>
                  </View>
                  {i < REC_TIPS.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </Animated.View>
          )}

          {/* ── RECORDING: timer + waveform ── */}
          {phase === 'recording' && (
            <Animated.View entering={FadeIn.duration(300)} style={[styles.card, styles.cardCenter, { backgroundColor: colors.surface }]}>
              <Text style={styles.timer}>{formatTime(recordingSeconds)}</Text>
              <Text style={styles.timerSub}>
                {recordingSeconds < MIN_RECORD_SECONDS
                  ? `${MIN_RECORD_SECONDS - recordingSeconds}s until you can stop`
                  : 'Recording in progress'}
              </Text>

              {/* Animated bars */}
              <View style={styles.waveform}>
                {WAVEFORM_HEIGHTS.map((h, i) => (
                  <WaveBar key={i} height={h} index={i} />
                ))}
              </View>

              {/* Pulsing ring + stop button */}
              <View style={styles.recordBtnWrap}>
                <Animated.View style={[styles.pulseRing, pulseStyle]} />
                <Pressable
                  onPress={handleStopRecording}
                  disabled={recordingSeconds < MIN_RECORD_SECONDS}
                  style={({ pressed }) => [
                    styles.stopBtn,
                    { opacity: pressed ? 0.8 : recordingSeconds < MIN_RECORD_SECONDS ? 0.35 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Stop recording"
                >
                  <View style={styles.stopIcon} />
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* ── REVIEWING: playback ── */}
          {phase === 'reviewing' && (
            <Animated.View entering={FadeInDown.delay(80).duration(380)} style={[styles.card, styles.cardCenter, { backgroundColor: colors.surface }]}>
              <Pressable
                onPress={handleTogglePreview}
                style={({ pressed }) => [styles.playBtn, { opacity: pressed ? 0.75 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
              >
                <LinearGradient colors={['#5B5BD6', '#9B8EC4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.playBtnGrad}>
                  <Ionicons name={isPreviewPlaying ? 'pause' : 'play'} size={28} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
              <Text style={styles.reviewLabel}>
                {isPreviewPlaying ? 'Playing your recording…' : 'Tap to preview your voice'}
              </Text>
              {uploadError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="warning-outline" size={16} color="#D96C6C" />
                  <Text style={styles.errorText}>{uploadError}</Text>
                </View>
              )}
              <Pressable onPress={handleReRecord} style={({ pressed }) => [styles.reRecordBtn, { opacity: pressed ? 0.6 : 1 }]}>
                <Ionicons name="refresh-outline" size={14} color="#7B5EA7" />
                <Text style={styles.reRecordText}>Record again</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* ── UPLOADING ── */}
          {phase === 'uploading' && (
            <Animated.View entering={FadeIn.duration(300)} style={[styles.card, styles.cardCenter, { backgroundColor: colors.surface }]}>
              <ActivityIndicator size="large" color="#5B5BD6" />
              <Text style={styles.uploadingText}>Uploading your recording…</Text>
            </Animated.View>
          )}

          {/* ── SUCCESS ── */}
          {phase === 'success' && (
            <Animated.View entering={FadeInDown.delay(80).duration(420)} style={[styles.card, styles.cardCenter, { backgroundColor: colors.surface }]}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>Voice clone created</Text>
              <Text style={styles.successSub}>Your next story will be narrated in your voice.</Text>
            </Animated.View>
          )}

          {/* ── HAS CLONE: status + actions ── */}
          {phase === 'has_clone' && (
            <>
              <Animated.View entering={FadeInDown.delay(160).duration(420)} style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.activeRow}>
                  <View style={styles.activeIconWrap}>
                    <Ionicons name="mic" size={22} color="#7B5EA7" />
                  </View>
                  <View style={styles.activeInfo}>
                    <View style={styles.activeTitleRow}>
                      <Text style={styles.activeName}>Your Voice</Text>
                      <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    </View>
                    <Text style={styles.activeSub}>Every story is narrated in your voice</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(220).duration(420)} style={[styles.card, { backgroundColor: colors.surface, padding: 0, overflow: 'hidden' }]}>
                <Pressable
                  onPress={handleReRecord}
                  style={({ pressed }) => [styles.actionRow, { backgroundColor: pressed ? '#F8F7FF' : 'transparent' }]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#EDE9FF' }]}>
                    <Ionicons name="mic-outline" size={18} color="#5B5BD6" />
                  </View>
                  <Text style={styles.actionLabel}>Re-record my voice</Text>
                  <Ionicons name="chevron-forward" size={18} color="#C4B6D8" />
                </Pressable>
                <View style={styles.actionDivider} />
                <Pressable
                  onPress={handleRemoveVoice}
                  style={({ pressed }) => [styles.actionRow, { backgroundColor: pressed ? '#FFF5F5' : 'transparent' }]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#FFECEC' }]}>
                    <Ionicons name="trash-outline" size={18} color="#D96C6C" />
                  </View>
                  <Text style={[styles.actionLabel, { color: '#D96C6C' }]}>Remove my voice</Text>
                </Pressable>
              </Animated.View>
            </>
          )}
        </ScrollView>

        {/* ── Sticky CTA ── */}
        {(phase === 'idle' || phase === 'reviewing' || phase === 'success' || phase === 'has_clone') && (
          <Animated.View entering={FadeInDown.delay(260).duration(420)} style={styles.ctaBar}>
            {phase === 'idle' && (
              <Pressable
                onPress={handleStartRecording}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, borderRadius: Radii.button }]}
                accessibilityRole="button"
                accessibilityLabel="Start recording"
              >
                <LinearGradient colors={['#5B5BD6', '#9B8EC4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
                  <Ionicons name="mic" size={20} color="#FFFFFF" />
                  <Text style={styles.ctaLabel}>Start recording</Text>
                </LinearGradient>
              </Pressable>
            )}
            {phase === 'reviewing' && (
              <Pressable
                onPress={handleUseThisVoice}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, borderRadius: Radii.button }]}
                accessibilityRole="button"
                accessibilityLabel="Use this voice"
              >
                <LinearGradient colors={['#5B5BD6', '#9B8EC4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.ctaLabel}>Use this voice</Text>
                </LinearGradient>
              </Pressable>
            )}
            {(phase === 'success' || phase === 'has_clone') && (
              <Pressable
                onPress={closeProfilePanel}
                style={({ pressed }) => [styles.ctaDone, { opacity: pressed ? 0.75 : 1 }]}
                accessibilityRole="button"
              >
                <Text style={styles.ctaDoneLabel}>{phase === 'success' ? 'Done' : 'Close'}</Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  )
}

// ─── Animated waveform bar ────────────────────────────────────────────────────

const WAVEFORM_HEIGHTS = [14, 22, 32, 40, 28, 36, 20, 30, 18, 26, 34, 24, 16, 30, 22]

function WaveBar({ height, index }: { height: number; index: number }) {
  const anim = useSharedValue(height)
  useEffect(() => {
    anim.value = withRepeat(
      withSequence(
        withTiming(height * (0.5 + Math.random() * 0.9), { duration: 400 + index * 30 }),
        withTiming(height, { duration: 400 + index * 30 }),
      ),
      -1,
      true,
    )
  }, [anim, height, index])
  const barStyle = useAnimatedStyle(() => ({ height: anim.value }))
  return <Animated.View style={[styles.waveBar, barStyle]} />
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },

  // Hero
  hero: { alignItems: 'center', marginBottom: Spacing.lg, paddingHorizontal: Spacing.sm },
  heroEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  heroTitle: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: '#4B367C', textAlign: 'center', marginBottom: Spacing.sm },
  heroSub: { fontFamily: 'Nunito_500Medium', fontSize: 15, color: '#7B6B9E', textAlign: 'center', lineHeight: 22 },

  // Card
  card: {
    borderRadius: Radii.cardLarge,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#F0EBFF',
  },
  cardCenter: { alignItems: 'center', paddingVertical: Spacing.xl },

  // Tips
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  tipIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EDE9FF',
    alignItems: 'center', justifyContent: 'center',
  },
  tipText: { flex: 1, fontFamily: 'Nunito_500Medium', fontSize: 14, color: '#5C4D7D', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#F3F0F8', marginLeft: 52 },

  // Timer
  timer: { fontFamily: 'Nunito_700Bold', fontSize: 52, color: '#4B367C', letterSpacing: -1 },
  timerSub: { fontFamily: 'Nunito_500Medium', fontSize: 13, color: '#9B8EC4', marginTop: Spacing.xs, marginBottom: Spacing.lg },

  // Waveform
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 48, marginBottom: Spacing.xl },
  waveBar: { width: 4, borderRadius: 2, backgroundColor: '#8B7ED8' },

  // Record / stop button
  recordBtnWrap: { alignItems: 'center', justifyContent: 'center', width: 72, height: 72 },
  pulseRing: {
    position: 'absolute',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#5B5BD6',
  },
  stopBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#5B5BD6',
    alignItems: 'center', justifyContent: 'center',
  },
  stopIcon: { width: 18, height: 18, borderRadius: 3, backgroundColor: '#FFFFFF' },

  // Review
  playBtn: { marginBottom: Spacing.md },
  playBtnGrad: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewLabel: { fontFamily: 'Nunito_500Medium', fontSize: 14, color: '#7B6B9E', marginBottom: Spacing.md },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#FFF0F0', borderRadius: Radii.small,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: '#F8CECE',
  },
  errorText: { flex: 1, fontFamily: 'Nunito_500Medium', fontSize: 13, color: '#D96C6C' },
  reRecordBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
  reRecordText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#7B5EA7' },

  // Uploading
  uploadingText: { fontFamily: 'Nunito_500Medium', fontSize: 14, color: '#7B6B9E', marginTop: Spacing.md },

  // Success
  successCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#4CAF7D',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: '#4B367C', marginBottom: Spacing.sm },
  successSub: { fontFamily: 'Nunito_500Medium', fontSize: 14, color: '#7B6B9E', textAlign: 'center', lineHeight: 20 },

  // Has clone
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  activeIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EDE9FF',
    alignItems: 'center', justifyContent: 'center',
  },
  activeInfo: { flex: 1 },
  activeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  activeName: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#4B367C' },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(76,175,125,0.12)',
    borderWidth: 1, borderColor: 'rgba(76,175,125,0.25)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF7D' },
  activeBadgeText: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: '#4CAF7D' },
  activeSub: { fontFamily: 'Nunito_500Medium', fontSize: 13, color: '#7B6B9E' },

  // Actions
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  actionIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: '#5C4D7D' },
  actionDivider: { height: 1, backgroundColor: '#F3F0F8', marginLeft: 52 + Spacing.md },

  // CTA
  ctaBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  ctaGradient: {
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  ctaLabel: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#FFFFFF' },
  ctaDone: {
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    backgroundColor: '#F0EBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDoneLabel: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#5B5BD6' },
})
