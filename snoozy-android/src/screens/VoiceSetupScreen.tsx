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

const SCRIPT_TEMPLATE =
  `Tonight, the moon was soft and round, hanging low over the trees. Little [NAME] curled up under a warm blanket, eyes already heavy. Outside, the wind hummed a gentle song, and inside, everything felt hushed and still.\n\n` +
  `Have you ever watched the stars drift slowly through the dark? Each one carries a tiny wish — brave ones and bright ones — floating through the quiet above the sleeping world. There are thousands of them up there tonight, and the very brightest of them all belongs to [NAME].\n\n` +
  `Far across the fields, a cricket sang its slow, steady song. The branches swayed, the leaves gave a soft rustle, and the whole night breathed in and out like something very old and very calm. That breath found its way through the trees, past the hills, right to where [NAME] lay — warm, and safe, and loved.\n\n` +
  `Goodnight. Sleep is already here, soft as a feather, waiting just at the door.`

// ─── ScriptText ───────────────────────────────────────────────────────────────

function ScriptText({ name, accentColor }: { name: string; accentColor: string }) {
  const resolvedName = name || 'your child'
  const parts = SCRIPT_TEMPLATE.split('[NAME]')
  return (
    <Text style={styles.scriptBody}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          <Text>{part}</Text>
          {i < parts.length - 1 && (
            <Text style={[styles.scriptName, { color: accentColor }]}>{resolvedName}</Text>
          )}
        </React.Fragment>
      ))}
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
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle')
  const [uploadError, setUploadError]   = useState<string | null>(null)
  const [finalDuration, setFinalDuration]       = useState(0)
  const uploadedModelIdRef                       = useRef<string | null>(null)

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
      setFinalDuration(recordingSeconds)
      setIsPreviewPlaying(false)
      setUploadStatus('uploading')
      setPhase('reviewing')

      // Upload runs silently while the parent listens to playback
      ;(async () => {
        try {
          const token = await getToken()
          if (!token) throw new Error('Not authenticated')
          const voiceName = childDetails.name ? `${childDetails.name}'s Voice` : 'My Voice'
          const modelId = await apiService.createVoiceClone(uri, voiceName, token)
          uploadedModelIdRef.current = modelId
          setUploadError(null)
          setUploadStatus('done')
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[VoiceSetup] Upload failed:', msg)
          setUploadError(msg)
          setUploadStatus('error')
        }
      })()
    } catch {
      Alert.alert('Recording error', 'Something went wrong. Please try again.')
      setPhase('briefing')
    }
  }, [recorder, recordingSeconds, getToken, childDetails.name])

  const handleReRecord = useCallback(() => {
    previewPlayerRef.current?.remove()
    previewPlayerRef.current = null
    setRecordingUri(null)
    setRecordingSeconds(0)
    setFinalDuration(0)
    setIsPreviewPlaying(false)
    setUploadStatus('idle')
    uploadedModelIdRef.current = null
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
    if (uploadStatus === 'uploading') return

    // Retry if previous upload failed
    if (uploadStatus === 'error' || !uploadedModelIdRef.current) {
      if (!recordingUri) return
      setUploadStatus('uploading')
      ;(async () => {
        try {
          const token = await getToken()
          if (!token) throw new Error('Not authenticated')
          const voiceName = childDetails.name ? `${childDetails.name}'s Voice` : 'My Voice'
          const modelId = await apiService.createVoiceClone(recordingUri, voiceName, token)
          uploadedModelIdRef.current = modelId
          setUploadError(null)
          setUploadStatus('done')
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[VoiceSetup] Retry failed:', msg)
          setUploadError(msg)
          setUploadStatus('error')
        }
      })()
      return
    }

    // Upload already done — just persist and advance
    const modelId = uploadedModelIdRef.current
    try {
      setFishVoiceModelId(modelId)
      const raw = await AsyncStorage.getItem(CHILD_PROFILE_KEY)
      const profile = raw ? JSON.parse(raw) : {}
      await AsyncStorage.setItem(
        CHILD_PROFILE_KEY,
        JSON.stringify({ ...profile, fishVoiceModelId: modelId, voiceId: modelId }),
      )
    } finally {
      setPhase('success')
    }
  }, [uploadStatus, recordingUri, getToken, childDetails.name, setFishVoiceModelId])

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
            {phase === 'recording' ? 'Recording'
              : phase === 'reviewing' ? 'Preview'
              : (phase === 'success' || phase === 'has_clone') ? 'All set'
              : 'Voice setup'}
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
            <Animated.View entering={FadeInDown.delay(60).duration(400)}>

              {/* Heading */}
              <View style={styles.prevHeroText}>
                <Text style={[styles.prevHeading, { color: colors.ink }]}>
                  {'How does '}
                  <Text style={{ color: colors.primary }}>this sound?</Text>
                </Text>
                <Text style={[styles.prevSubtitle, { color: colors.inkSoft }]}>
                  Listen back and make sure it sounds like you.
                </Text>
              </View>

              {/* Playback card */}
              <View style={[styles.card, styles.prevCard, { backgroundColor: colors.surface }]}>

                {/* Play button */}
                <View style={styles.prevPlayOuter}>
                  <View style={[styles.prevPlayRing, { backgroundColor: colors.primarySoft }]} />
                  <Pressable
                    onPress={handleTogglePreview}
                    style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                    accessibilityRole="button"
                    accessibilityLabel={isPreviewPlaying ? 'Pause preview' : 'Play preview'}
                  >
                    <View style={[styles.prevPlayBtn, { backgroundColor: colors.primary }]}>
                      <Ionicons name={isPreviewPlaying ? 'pause' : 'play'} size={32} color="#FFFFFF" style={{ marginLeft: isPreviewPlaying ? 0 : 3 }} />
                    </View>
                  </Pressable>
                </View>

                {/* Waveform */}
                <View style={styles.prevWaveform}>
                  {WAVEFORM_HEIGHTS_PREVIEW.map((h, i) => (
                    <WaveBar key={i} height={h} index={i} color={colors.primary} />
                  ))}
                </View>

                {/* Duration badge */}
                <View style={[styles.prevDurationBadge, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.prevDurationText, { color: colors.primary }]}>
                    {formatTime(finalDuration)} recorded
                  </Text>
                </View>

                {/* Upload status */}
                <View style={styles.prevStatusRow}>
                  {uploadStatus === 'uploading' && (
                    <>
                      <ActivityIndicator size="small" color={colors.inkMute} />
                      <Text style={[styles.prevStatusText, { color: colors.inkMute }]}>Saving your voice…</Text>
                    </>
                  )}
                  {uploadStatus === 'done' && (
                    <>
                      <Ionicons name="checkmark-circle" size={15} color="#4CAF7D" />
                      <Text style={[styles.prevStatusText, { color: '#4CAF7D' }]}>Voice saved</Text>
                    </>
                  )}
                  {uploadStatus === 'error' && (
                    <>
                      <Ionicons name="warning-outline" size={15} color={colors.error} />
                      <Text style={[styles.prevStatusText, { color: colors.error }]}>
                        {uploadError ?? 'Upload failed — tap Try again'}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </Animated.View>
          )}

          {/* ── UPLOADING ── */}
          {phase === 'uploading' && (
            <Animated.View entering={FadeIn.duration(300)} style={[styles.card, styles.cardCenter, { backgroundColor: colors.surface }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.uploadingText, { color: colors.inkSoft }]}>Uploading your recording…</Text>
            </Animated.View>
          )}

          {/* ── DONE (success + has_clone) ── */}
          {(phase === 'success' || phase === 'has_clone') && (
            <Animated.View entering={FadeInDown.delay(60).duration(420)}>

              {/* Hero — check circle with sparkle stars */}
              <View style={styles.doneHero}>
                <View style={styles.doneStarsWrap}>
                  <Text style={[styles.doneStar, { top: -4,  left:  6, fontSize: 18 }]}>✦</Text>
                  <Text style={[styles.doneStar, { top: -14, right: -8, fontSize: 26 }]}>✦</Text>
                  <Text style={[styles.doneStar, { top: 36,  right: -20, fontSize: 13 }]}>✦</Text>
                  <Text style={[styles.doneStar, { bottom: 0, left: 0,  fontSize: 20 }]}>✦</Text>
                  <View style={styles.doneCircle}>
                    <Ionicons name="checkmark" size={38} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={[styles.doneHeading, { color: colors.ink }]}>
                  {'Your voice is '}
                  <Text style={{ color: colors.primary }}>ready</Text>
                </Text>
                <Text style={[styles.doneSubtitle, { color: colors.inkSoft }]}>
                  {"We'll use it to read stories for\n"}
                  <Text style={{ color: colors.primary }}>{childDetails.name || 'your child'}</Text>
                  {'.'}
                </Text>
              </View>

              {/* Voice card */}
              <View style={[styles.card, styles.doneCard, { backgroundColor: colors.surface }]}>
                {/* Title row */}
                <View style={styles.doneCardTitleRow}>
                  <Text style={[styles.doneCardTitle, { color: colors.ink }]}>Your Voice</Text>
                  <View style={styles.doneActiveBadge}>
                    <Text style={styles.doneActiveBadgeText}>Active</Text>
                  </View>
                </View>
                <Text style={[styles.doneCardSub, { color: colors.inkSoft }]}>
                  Reads stories for {childDetails.name || 'your child'}
                </Text>

                {/* Pronunciation sub-row */}
                {selectedPronunciation !== '' && (
                  <View style={[styles.donePronRow, { backgroundColor: colors.background }]}>
                    <View style={styles.donePronText}>
                      <Text style={[styles.donePronLabel, { color: colors.inkMute }]}>Pronunciation</Text>
                      <Text style={[styles.donePronValue, { color: colors.ink }]}>{selectedPronunciation}</Text>
                    </View>
                    <Ionicons name="volume-medium-outline" size={22} color={colors.inkMute} />
                  </View>
                )}
              </View>

              {/* Notice bar */}
              <View style={[styles.doneNotice, { backgroundColor: colors.backgroundDeep }]}>
                <Text style={[styles.doneNoticeStar, { color: colors.starGold }]}>★</Text>
                <Text style={[styles.doneNoticeText, { color: colors.inkSoft }]}>
                  You can update your voice or re-record anytime in settings.
                </Text>
              </View>
            </Animated.View>
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
              <View style={styles.prevCtaStack}>
                {/* Primary — disabled until upload done */}
                <Pressable
                  onPress={handleUseThisVoice}
                  disabled={uploadStatus === 'uploading'}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, borderRadius: Radii.button }]}
                  accessibilityRole="button"
                  accessibilityLabel={uploadStatus === 'error' ? 'Try again' : 'Sounds good'}
                >
                  {uploadStatus === 'done' ? (
                    <LinearGradient colors={['#5B5BD6', '#9B8EC4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.ctaLabel}>Sounds good</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.ctaGradient, { backgroundColor: uploadStatus === 'error' ? colors.error : 'rgba(91,91,214,0.22)' }]}>
                      <Text style={[styles.ctaLabel, { color: uploadStatus === 'error' ? '#FFFFFF' : colors.inkMute }]}>
                        {uploadStatus === 'error' ? 'Try again' : 'Sounds good'}
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Secondary — record again */}
                <Pressable
                  onPress={handleReRecord}
                  style={({ pressed }) => [styles.ctaRecordAgain, { borderColor: colors.hair, opacity: pressed ? 0.6 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Record again"
                >
                  <Text style={[styles.ctaRecordAgainLabel, { color: colors.inkSoft }]}>Record again</Text>
                </Pressable>
              </View>
            )}
            {(phase === 'success' || phase === 'has_clone') && (
              <Pressable
                onPress={closeProfilePanel}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, borderRadius: Radii.button }]}
                accessibilityRole="button"
                accessibilityLabel="Start reading stories"
              >
                <LinearGradient colors={['#5B5BD6', '#7B6BC4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
                  <Text style={styles.ctaLabel}>Start reading stories</Text>
                </LinearGradient>
              </Pressable>
            )}
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  )
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

const WAVEFORM_HEIGHTS         = [14, 22, 32, 40, 28, 36, 20, 30, 18, 26, 34, 24, 16, 30, 22]
const WAVEFORM_HEIGHTS_REC     = [6, 14, 24, 36, 28, 42, 30, 44, 22, 38, 46, 32, 40, 20, 36, 28, 44, 34, 18, 40, 26, 36, 22, 14, 8]
const WAVEFORM_HEIGHTS_PREVIEW = [4, 10, 20, 34, 26, 40, 30, 44, 18, 36, 42, 28, 38, 16, 32, 24, 40, 30, 14, 36, 22, 32, 18, 10, 6]

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

  // Preview (Screen 3)
  prevHeroText:     { alignItems: 'center', marginBottom: Spacing.xl },
  prevHeading:      { fontSize: 28, fontFamily: 'Nunito_700Bold', letterSpacing: -0.3, textAlign: 'center', marginBottom: Spacing.sm },
  prevSubtitle:     { fontFamily: 'Nunito_500Medium', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  prevCard:         { alignItems: 'center', paddingVertical: Spacing.xl, paddingHorizontal: Spacing.lg },
  prevPlayOuter:    { alignItems: 'center', justifyContent: 'center', width: 130, height: 130, marginBottom: Spacing.lg },
  prevPlayRing:     { position: 'absolute', width: 130, height: 130, borderRadius: 65 },
  prevPlayBtn:      { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  prevWaveform:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 52, width: '100%', marginBottom: Spacing.md },
  prevDurationBadge:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: 20, marginBottom: Spacing.md },
  prevDurationText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13 },
  prevStatusRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: 22 },
  prevStatusText:   { fontFamily: 'Nunito_500Medium', fontSize: 13 },
  prevCtaStack:     { gap: Spacing.sm },
  ctaRecordAgain:   { height: Sizing.buttonHeight, borderRadius: Radii.button, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  ctaRecordAgainLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 16 },

  // Uploading
  uploadingText: { fontFamily: 'Nunito_500Medium', fontSize: 14, marginTop: Spacing.md },

  // Done — Screen 4 (success + has_clone)
  doneHero:         { alignItems: 'center', marginBottom: Spacing.xl },
  doneStarsWrap:    { position: 'relative', width: 140, height: 110, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  doneStar:         { position: 'absolute', fontFamily: 'Nunito_700Bold', color: '#F5C842' },
  doneCircle:       { width: 88, height: 88, borderRadius: 44, backgroundColor: '#4CAF7D', alignItems: 'center', justifyContent: 'center' },
  doneHeading:      { fontSize: 28, fontFamily: 'Nunito_700Bold', letterSpacing: -0.3, textAlign: 'center', marginBottom: Spacing.sm },
  doneSubtitle:     { fontFamily: 'Nunito_500Medium', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  doneCard:         { marginBottom: Spacing.sm },
  doneCardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  doneCardTitle:    { fontFamily: 'Nunito_700Bold', fontSize: 17 },
  doneActiveBadge:  { backgroundColor: 'rgba(76,175,125,0.12)', borderWidth: 1, borderColor: 'rgba(76,175,125,0.3)', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: 10 },
  doneActiveBadgeText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#4CAF7D' },
  doneCardSub:      { fontFamily: 'Nunito_500Medium', fontSize: 14, marginBottom: Spacing.md },
  donePronRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radii.small, padding: Spacing.md },
  donePronText:     { flex: 1 },
  donePronLabel:    { fontFamily: 'Nunito_600SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  donePronValue:    { fontFamily: 'Nunito_700Bold', fontSize: 16 },
  doneNotice:       { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderRadius: Radii.card, padding: Spacing.md, marginBottom: Spacing.sm },
  doneNoticeStar:   { fontSize: 18, lineHeight: 22 },
  doneNoticeText:   { flex: 1, fontFamily: 'Nunito_500Medium', fontSize: 14, lineHeight: 20 },

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
