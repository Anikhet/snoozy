import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
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

// ─── Constants ───────────────────────────────────────────────────────────────

type Phase = 'briefing' | 'recording' | 'reviewing' | 'uploading' | 'success' | 'has_clone'

const STEP_OF: Record<Phase, number> = {
  briefing:  1,
  recording: 2,
  reviewing: 3,
  uploading: 3,
  success:   4,
  has_clone: 4,
}
const TOTAL_STEPS = 4
const MIN_RECORD_SECONDS = 10
const REC_AIM_SECONDS    = 45
const REC_WAVEFORM_COLOR = '#D97070'
const REC_MIC_COLORS     = ['#C96B7A', '#E09AA6'] as const
const REC_PULSE_COLOR    = 'rgba(201,107,122,0.18)'

const BRIEFING_TIPS = [
  {
    icon: 'volume-mute-outline' as const,
    title: 'Find a quiet room',
    sub: 'Background noise can affect quality.',
  },
  {
    icon: 'phone-portrait-outline' as const,
    title: 'Hold your phone steady',
    sub: 'Keep it about 20–30 cm from your mouth.',
  },
  {
    icon: 'time-outline' as const,
    title: 'Speak clearly and slowly',
    sub: 'Take your time — you can always re-record.',
  },
]

const PRONUNCIATION_OPTIONS: Record<string, string[]> = {
  Aarav:   ['Aa-rav',   'Ah-rav',   'Ar-uv'],
  Ananya:  ['A-nun-ya', 'Ah-nan-ya', 'Uh-nun-ya'],
  Priya:   ['Pree-ya',  'Pri-ya',    'Pree-ah'],
  Arjun:   ['Ar-jun',   'Ur-jun',    'Ar-joon'],
  Diya:    ['Dee-ya',   'Di-ya',     'Dee-ah'],
  Vihaan:  ['Vi-haan',  'Vee-han',   'Vih-aan'],
  Ishaan:  ['I-shaan',  'Ee-shaan',  'Ish-aan'],
  Aanya:   ['Aa-nya',   'Ah-nya',    'An-ya'],
  Kavya:   ['Kuv-ya',   'Kav-ya',    'Kahv-ya'],
  Rohan:   ['Ro-han',   'Roh-an',    'Ro-hun'],
  Saanvi:  ['Saan-vi',  'San-vee',   'Saan-vee'],
  Riya:    ['Ree-ya',   'Ri-ya',     'Ree-ah'],
  Advait:  ['Ad-vait',  'Uhd-vait',  'Ad-vayt'],
  Aditya:  ['A-dit-ya', 'Ah-dit-ya', 'Uh-dit-ya'],
  Kiara:   ['Ki-ara',   'Kee-ara',   'Key-ara'],
  Zara:    ['Za-ra',    'Zar-a',     'Zaa-ra'],
  Siya:    ['See-ya',   'Si-ya',     'See-ah'],
  Reyansh: ['Rey-ansh', 'Ray-unsh',  'Ree-ansh'],
  Aarohi:  ['Aa-ro-hi', 'Ah-ro-hee', 'Ar-o-hee'],
  Vivaan:  ['Vi-vaan',  'Vee-van',   'Vih-aan'],
}

function getPronunciationOptions(name: string): string[] {
  return PRONUNCIATION_OPTIONS[name] ?? []
}

function buildScript(name: string): string {
  return (
    `Hi, I'm reading this story just for ${name}. ` +
    `Once upon a time, in a land not so far away, ${name} went on a magical adventure filled with wonder.\n\n` +
    `${name} learned that courage, kindness, and a little imagination can make every day special. ` +
    `The end. Sweet dreams, ${name}.`
  )
}

// ─── ScriptText ───────────────────────────────────────────────────────────────

function ScriptText({ name, accentColor }: { name: string; accentColor: string }) {
  const script = buildScript(name || 'your child')
  if (!name) return <Text style={styles.scriptBody}>{script}</Text>

  const parts = script.split(new RegExp(`(${name})`, 'g'))
  return (
    <Text style={styles.scriptBody}>
      {parts.map((part, i) =>
        part === name
          ? <Text key={i} style={[styles.scriptName, { color: accentColor }]}>{part}</Text>
          : part
      )}
    </Text>
  )
}

// ─── VoiceSetupScreen ────────────────────────────────────────────────────────

export function VoiceSetupScreen() {
  const { colors } = useThemeColors()
  const { getToken } = useAuth()
  const closeProfilePanel = useStoryStore((s) => s.closeProfilePanel)
  const childDetails      = useStoryStore((s) => s.childDetails)
  const setFishVoiceModelId = useStoryStore((s) => s.setFishVoiceModelId)

  const existingModelId = childDetails.fishVoiceModelId
  const [phase, setPhase] = useState<Phase>(existingModelId ? 'has_clone' : 'briefing')
  const [recordingUri, setRecordingUri]         = useState<string | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [uploadError, setUploadError]           = useState<string | null>(null)

  const pronOptions = useMemo(() => getPronunciationOptions(childDetails.name ?? ''), [childDetails.name])
  const [selectedPronunciation, setSelectedPronunciation] = useState(() => pronOptions[0] ?? '')

  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const previewPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null)
  const recorder        = useAudioRecorder(RecordingPresets.HIGH_QUALITY)

  useBackHandler(phase === 'recording' ? () => {} : closeProfilePanel)

  // ── Pulse animation for recording indicator ─────────────────────────────
  const pulse = useSharedValue(1)
  useEffect(() => {
    if (phase === 'recording') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.25, { duration: 700 }),
          withTiming(1.0,  { duration: 700 }),
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
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase])

  // ── Cleanup preview player on unmount ──────────────────────────────────
  useEffect(() => {
    return () => { previewPlayerRef.current?.remove(); previewPlayerRef.current = null }
  }, [])

  // ── Recording actions ───────────────────────────────────────────────────

  const handleStartRecording = useCallback(async () => {
    const { granted } = await AudioModule.requestRecordingPermissionsAsync()
    if (!granted) {
      Alert.alert('Microphone access needed', 'Please allow microphone access in Settings to record your voice.', [{ text: 'OK' }])
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
      setPhase('briefing')
    }
  }, [recorder, recordingSeconds])

  const handleReRecord = useCallback(() => {
    previewPlayerRef.current?.remove()
    previewPlayerRef.current = null
    setRecordingUri(null)
    setRecordingSeconds(0)
    setIsPreviewPlaying(false)
    setUploadError(null)
    setPhase('briefing')
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
              setPhase('briefing')
            }
          },
        },
      ],
    )
  }, [existingModelId, getToken, setFishVoiceModelId])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  const noticeText = recordingSeconds < MIN_RECORD_SECONDS
    ? `Keep going — ${MIN_RECORD_SECONDS - recordingSeconds}s more to unlock stop`
    : recordingSeconds < REC_AIM_SECONDS
      ? `Sounding good — aim for ${REC_AIM_SECONDS} seconds.`
      : "That's great — tap to stop when ready."

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <BackSwipeZone onBack={phase === 'recording' ? () => {} : closeProfilePanel} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

        {/* ── Header ── */}
        <View style={[styles.header, { borderBottomColor: colors.hair }]}>
          <Pressable
            onPress={phase === 'recording' ? undefined : closeProfilePanel}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.5 : 1 }]}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.ink }]}>
            {phase === 'recording' ? 'Recording' : 'Voice setup'}
          </Text>
          <Text style={[styles.stepLabel, { color: colors.inkMute }]}>
            {STEP_OF[phase]} OF {TOTAL_STEPS}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Sizing.buttonHeight + Spacing.xl * 2 },
          ]}
        >

          {/* ── BRIEFING ── */}
          {phase === 'briefing' && (
            <Animated.View entering={FadeInDown.delay(60).duration(400)}>

              {/* Heading */}
              <View style={styles.briefingHeroText}>
                <Text style={[styles.briefingHeading, { color: colors.ink }]}>
                  {'Read stories in\n'}
                  <Text style={[styles.briefingHeadingAccent, { color: colors.primary }]}>your voice</Text>
                </Text>
              </View>

              {/* Mascot illustration */}
              <View style={styles.mascotWrap}>
                <Image
                  source={require('../../assets/images/mascot-happy.png')}
                  style={styles.mascot}
                  resizeMode="contain"
                />
              </View>

              {/* Tips */}
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                {BRIEFING_TIPS.map((tip, i) => (
                  <React.Fragment key={tip.title}>
                    <View style={styles.tipRow}>
                      <View style={[styles.tipIconBox, { backgroundColor: colors.primarySoft }]}>
                        <Ionicons name={tip.icon} size={18} color={colors.primary} />
                      </View>
                      <View style={styles.tipTextBlock}>
                        <Text style={[styles.tipTitle, { color: colors.ink }]}>{tip.title}</Text>
                        <Text style={[styles.tipSub, { color: colors.inkSoft }]}>{tip.sub}</Text>
                      </View>
                    </View>
                    {i < BRIEFING_TIPS.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: colors.hair }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>

              {/* Script card */}
              <View style={[styles.card, styles.scriptCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.scriptLabel, { color: colors.inkMute }]}>Read this short script</Text>
                <ScriptText
                  name={childDetails.name ?? ''}
                  accentColor={colors.primary}
                />
              </View>

              {/* Pronunciation */}
              {pronOptions.length > 1 && (
                <View style={styles.pronSection}>
                  <Text style={[styles.pronQuestion, { color: colors.ink }]}>
                    {'How do you say '}
                    <Text style={{ color: colors.primary }}>{childDetails.name}</Text>
                    {'?'}
                  </Text>
                  <View style={styles.pronChips}>
                    {pronOptions.map((option) => {
                      const selected = selectedPronunciation === option
                      return (
                        <Pressable
                          key={option}
                          onPress={() => setSelectedPronunciation(option)}
                          style={[
                            styles.pronChip,
                            {
                              borderColor:       selected ? colors.primary : colors.hair,
                              backgroundColor:   selected ? colors.primarySoft : colors.surface,
                              borderWidth:       selected ? 1.5 : 1,
                            },
                          ]}
                        >
                          <Text style={[
                            styles.pronChipText,
                            { color: selected ? colors.primary : colors.inkSoft },
                          ]}>
                            {option}
                          </Text>
                          {selected && (
                            <Ionicons name="checkmark" size={13} color={colors.primary} />
                          )}
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              )}
            </Animated.View>
          )}

          {/* ── RECORDING ── */}
          {phase === 'recording' && (
            <Animated.View entering={FadeIn.duration(300)}>

              {/* Script card — stays visible so parent can read along */}
              <View style={[styles.card, styles.scriptCard, { backgroundColor: colors.surface, marginBottom: Spacing.xl }]}>
                <Text style={[styles.scriptLabel, { color: colors.inkMute }]}>Read this short script</Text>
                <ScriptText name={childDetails.name ?? ''} accentColor={colors.primary} />
              </View>

              {/* Timer */}
              <Text style={[styles.recTimer, { color: colors.ink }]}>{formatTime(recordingSeconds)}</Text>

              {/* Waveform */}
              <View style={styles.recWaveform}>
                {WAVEFORM_HEIGHTS_REC.map((h, i) => (
                  <WaveBar key={i} height={h} index={i} color={REC_WAVEFORM_COLOR} />
                ))}
              </View>

              {/* Mic button */}
              <View style={styles.recMicOuter}>
                <Animated.View style={[styles.recPulseRing, { backgroundColor: REC_PULSE_COLOR }, pulseStyle]} />
                <Pressable
                  onPress={handleStopRecording}
                  disabled={recordingSeconds < MIN_RECORD_SECONDS}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : recordingSeconds < MIN_RECORD_SECONDS ? 0.45 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Stop recording"
                >
                  <LinearGradient
                    colors={REC_MIC_COLORS}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.recMicBtn}
                  >
                    <Ionicons name="mic" size={36} color="#FFFFFF" />
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Hint */}
              <Text style={[styles.recHint, { color: colors.inkMute }]}>Tap to stop recording</Text>
            </Animated.View>
          )}

          {/* ── REVIEWING ── */}
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
              <Text style={[styles.reviewLabel, { color: colors.inkSoft }]}>
                {isPreviewPlaying ? 'Playing your recording…' : 'Tap to preview your voice'}
              </Text>
              {uploadError && (
                <View style={[styles.errorBanner, { backgroundColor: '#FFF0F0', borderColor: '#F8CECE' }]}>
                  <Ionicons name="warning-outline" size={16} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{uploadError}</Text>
                </View>
              )}
              <Pressable onPress={handleReRecord} style={({ pressed }) => [styles.reRecordBtn, { opacity: pressed ? 0.6 : 1 }]}>
                <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                <Text style={[styles.reRecordText, { color: colors.primary }]}>Record again</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* ── UPLOADING ── */}
          {phase === 'uploading' && (
            <Animated.View entering={FadeIn.duration(300)} style={[styles.card, styles.cardCenter, { backgroundColor: colors.surface }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.uploadingText, { color: colors.inkSoft }]}>Uploading your recording…</Text>
            </Animated.View>
          )}

          {/* ── SUCCESS ── */}
          {phase === 'success' && (
            <Animated.View entering={FadeInDown.delay(80).duration(420)} style={[styles.card, styles.cardCenter, { backgroundColor: colors.surface }]}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
              <Text style={[styles.successTitle, { color: colors.ink }]}>Voice clone created</Text>
              <Text style={[styles.successSub, { color: colors.inkSoft }]}>Your next story will be narrated in your voice.</Text>
            </Animated.View>
          )}

          {/* ── HAS CLONE ── */}
          {phase === 'has_clone' && (
            <>
              <Animated.View entering={FadeInDown.delay(160).duration(420)} style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.activeRow}>
                  <View style={[styles.activeIconWrap, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="mic" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.activeInfo}>
                    <View style={styles.activeTitleRow}>
                      <Text style={[styles.activeName, { color: colors.ink }]}>Your Voice</Text>
                      <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    </View>
                    <Text style={[styles.activeSub, { color: colors.inkSoft }]}>Every story is narrated in your voice</Text>
                  </View>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(220).duration(420)} style={[styles.card, { backgroundColor: colors.surface, padding: 0, overflow: 'hidden' }]}>
                <Pressable
                  onPress={handleReRecord}
                  style={({ pressed }) => [styles.actionRow, { backgroundColor: pressed ? colors.primarySoft : 'transparent' }]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="mic-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.ink }]}>Re-record my voice</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.inkMute} />
                </Pressable>
                <View style={[styles.actionDivider, { backgroundColor: colors.hair }]} />
                <Pressable
                  onPress={handleRemoveVoice}
                  style={({ pressed }) => [styles.actionRow, { backgroundColor: pressed ? '#FFF5F5' : 'transparent' }]}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#FFECEC' }]}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.error }]}>Remove my voice</Text>
                </Pressable>
              </Animated.View>
            </>
          )}
        </ScrollView>

        {/* ── Sticky CTA / Notice ── */}
        {(phase === 'briefing' || phase === 'recording' || phase === 'reviewing' || phase === 'success' || phase === 'has_clone') && (
          <Animated.View entering={FadeInDown.delay(260).duration(420)} style={styles.ctaBar}>
            {phase === 'recording' && (
              <View style={[styles.noticeBar, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={[styles.noticeText, { color: colors.primary }]}>{noticeText}</Text>
              </View>
            )}
            {phase === 'briefing' && (
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
                accessibilityLabel="Sounds good"
              >
                <LinearGradient colors={['#5B5BD6', '#9B8EC4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.ctaLabel}>Sounds good</Text>
                </LinearGradient>
              </Pressable>
            )}
            {(phase === 'success' || phase === 'has_clone') && (
              <Pressable
                onPress={closeProfilePanel}
                style={({ pressed }) => [styles.ctaDone, { backgroundColor: colors.primarySoft, opacity: pressed ? 0.75 : 1 }]}
                accessibilityRole="button"
              >
                <Text style={[styles.ctaDoneLabel, { color: colors.primary }]}>
                  {phase === 'success' ? 'Done' : 'Close'}
                </Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  )
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

const WAVEFORM_HEIGHTS = [14, 22, 32, 40, 28, 36, 20, 30, 18, 26, 34, 24, 16, 30, 22]
const WAVEFORM_HEIGHTS_REC = [6, 14, 24, 36, 28, 42, 30, 44, 22, 38, 46, 32, 40, 20, 36, 28, 44, 34, 18, 40, 26, 36, 22, 14, 8]

function WaveBar({ height, index, color = '#8B7ED8' }: { height: number; index: number; color?: string }) {
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
  return <Animated.View style={[styles.waveBar, { backgroundColor: color }, barStyle]} />
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn:     { padding: Spacing.xs, marginRight: Spacing.sm },
  headerTitle: { flex: 1, ...Fonts.bodyBold, textAlign: 'center' },
  stepLabel:   { ...Fonts.caption, minWidth: 40, textAlign: 'right' },

  // Scroll
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },

  // Briefing hero
  briefingHeroText: { alignItems: 'center', marginBottom: Spacing.md },
  briefingHeading: {
    fontSize: 30,
    fontFamily: 'Nunito_700Bold',
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 40,
  },
  briefingHeadingAccent: { fontSize: 30, fontFamily: 'Nunito_700Bold', letterSpacing: -0.5 },

  // Mascot
  mascotWrap: { alignItems: 'center', marginBottom: Spacing.lg },
  mascot:     { width: 130, height: 130 },

  // Card
  card: {
    borderRadius: Radii.cardLarge,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(91,91,214,0.1)',
  },
  cardCenter: { alignItems: 'center', paddingVertical: Spacing.xl },

  // Tips
  tipRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  tipIconBox:  { width: 38, height: 38, borderRadius: Radii.small, alignItems: 'center', justifyContent: 'center' },
  tipTextBlock:{ flex: 1 },
  tipTitle:    { fontFamily: 'Nunito_700Bold', fontSize: 14, marginBottom: 2 },
  tipSub:      { fontFamily: 'Nunito_500Medium', fontSize: 13, lineHeight: 18 },
  divider:     { height: 1, marginLeft: 38 + Spacing.md },

  // Script card
  scriptCard:  { paddingTop: Spacing.md },
  scriptLabel: { ...Fonts.caption, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm },
  scriptBody:  { fontFamily: 'Nunito_500Medium', fontSize: 15, lineHeight: 24 },
  scriptName:  { fontFamily: 'Nunito_700Bold', fontSize: 15 },

  // Pronunciation
  pronSection: { marginTop: Spacing.sm, marginBottom: Spacing.sm },
  pronQuestion:{ fontFamily: 'Nunito_700Bold', fontSize: 15, marginBottom: Spacing.sm },
  pronChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pronChip:    {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radii.button,
  },
  pronChipText:{ fontFamily: 'Nunito_600SemiBold', fontSize: 14 },

  // Waveform (shared bar shape)
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 48, marginBottom: Spacing.xl },
  waveBar:  { width: 4, borderRadius: 2 },

  // Recording phase
  recTimer:    { fontFamily: 'monospace', fontSize: 58, fontWeight: '700', letterSpacing: 3, textAlign: 'center', marginBottom: Spacing.lg },
  recWaveform: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 52, marginBottom: Spacing.xxl, paddingHorizontal: Spacing.md },
  recMicOuter: { alignItems: 'center', justifyContent: 'center', width: 120, height: 120, alignSelf: 'center' },
  recPulseRing:{ position: 'absolute', width: 120, height: 120, borderRadius: 60 },
  recMicBtn:   { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  recHint:     { fontFamily: 'Nunito_500Medium', fontSize: 14, textAlign: 'center', marginTop: Spacing.lg },

  // Notice bar (recording phase bottom)
  noticeBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: 14, paddingHorizontal: Spacing.lg, borderRadius: Radii.button },
  noticeText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14 },

  // Review
  playBtn:    { marginBottom: Spacing.md },
  playBtnGrad:{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  reviewLabel:{ fontFamily: 'Nunito_500Medium', fontSize: 14, marginBottom: Spacing.md },
  errorBanner:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radii.small, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1 },
  errorText:  { flex: 1, fontFamily: 'Nunito_500Medium', fontSize: 13 },
  reRecordBtn:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
  reRecordText:{ fontFamily: 'Nunito_600SemiBold', fontSize: 13 },

  // Uploading
  uploadingText: { fontFamily: 'Nunito_500Medium', fontSize: 14, marginTop: Spacing.md },

  // Success
  successCircle:{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#4CAF7D', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  successTitle: { fontFamily: 'Nunito_700Bold', fontSize: 18, marginBottom: Spacing.sm },
  successSub:   { fontFamily: 'Nunito_500Medium', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Has clone
  activeRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  activeIconWrap:{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  activeInfo:    { flex: 1 },
  activeTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  activeName:    { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  activeBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(76,175,125,0.12)', borderWidth: 1, borderColor: 'rgba(76,175,125,0.25)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  activeDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF7D' },
  activeBadgeText:{ fontFamily: 'Nunito_700Bold', fontSize: 10, color: '#4CAF7D' },
  activeSub:     { fontFamily: 'Nunito_500Medium', fontSize: 13 },

  // Actions
  actionRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  actionIconWrap:{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionLabel:  { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 15 },
  actionDivider:{ height: 1, marginLeft: 52 + Spacing.md },

  // CTA
  ctaBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom:     Spacing.lg,
    paddingTop:        Spacing.sm,
  },
  ctaGradient: {
    height:          Sizing.buttonHeight,
    borderRadius:    Radii.button,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
  },
  ctaLabel:     { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#FFFFFF' },
  ctaDone:      { height: Sizing.buttonHeight, borderRadius: Radii.button, alignItems: 'center', justifyContent: 'center' },
  ctaDoneLabel: { fontFamily: 'Nunito_700Bold', fontSize: 16 },
})
