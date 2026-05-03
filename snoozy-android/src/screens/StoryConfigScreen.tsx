import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@clerk/clerk-expo'
import { useThemeColors } from '@/hooks/useThemeColors'
import {
  Fonts,
  Radii,
  Sizing,
  Spacing,
  getCardShadow,
  getLiftShadow,
} from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { AppConfig } from '@/config/appConfig'
import { VOICES } from '@/config/voices'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const VOICE_TILE_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.lg * 2 - 10) / 2

// Mirrors the arrays in WorldPickerScreen — single source of truth if moved to a shared config
const WORLDS = [
  { id: 'kingdom', emoji: '🏰', name: 'Magical Kingdom' },
  { id: 'forest',  emoji: '🌲', name: 'Enchanted Forest' },
  { id: 'space',   emoji: '🚀', name: 'Outer Space' },
  { id: 'ocean',   emoji: '🐠', name: 'Ocean Deep' },
  { id: 'clouds',  emoji: '☁️', name: 'Cloud Kingdom' },
  { id: 'jungle',  emoji: '🦁', name: 'Magical Safari' },
]

const VIBES = [
  { id: 'cozy',    emoji: '🌙', name: 'Sleepy & Cozy' },
  { id: 'brave',   emoji: '💪', name: 'Be Brave' },
  { id: 'kind',    emoji: '🤝', name: 'Be Kind' },
  { id: 'wonder',  emoji: '🌟', name: 'Full of Wonder' },
  { id: 'friends', emoji: '🐾', name: 'Make a Friend' },
]

export default function StoryConfigScreen() {
  const { colors, isDark } = useThemeColors()
  const { getToken } = useAuth()
  const navigateToWorldPicker = useStoryStore((s) => s.navigateToWorldPicker)
  const generateStory = useStoryStore((s) => s.generateStory)
  const updateChildDetails = useStoryStore((s) => s.updateChildDetails)
  const savedChildDetails = useStoryStore((s) => s.childDetails)
  const selectedWorldId = useStoryStore((s) => s.selectedWorldId)
  const selectedVibeId = useStoryStore((s) => s.selectedVibeId)
  const onboardingDefaults = useStoryStore((s) => s.onboardingDefaults)

  const [name, setName] = useState(savedChildDetails.name || onboardingDefaults?.name || '')
  const [age, setAge] = useState<number | null>(
    savedChildDetails.age > 0 ? savedChildDetails.age : null,
  )
  const [voiceId, setVoiceId] = useState(savedChildDetails.voiceId || VOICES[0].id)
  const [nameFocused, setNameFocused] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const worldEntry = WORLDS.find((w) => w.id === selectedWorldId)
  const vibeEntry = VIBES.find((v) => v.id === selectedVibeId)

  const canGenerate = name.trim().length > 0 && age !== null && voiceId.length > 0

  const handleGenerate = useCallback(async () => {
    if (!canGenerate || isGenerating) return
    setIsGenerating(true)
    try {
      updateChildDetails({ name: name.trim(), age: age!, voiceId })
      const token = await getToken()
      if (token) generateStory(token)
    } finally {
      setIsGenerating(false)
    }
  }, [canGenerate, isGenerating, name, age, voiceId, updateChildDetails, getToken, generateStory])

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(450)}
            style={styles.header}
          >
            <Pressable
              style={[styles.backBtn, { backgroundColor: colors.surface, ...getCardShadow(isDark) }]}
              onPress={navigateToWorldPicker}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={22} color={colors.ink} />
            </Pressable>
            <View
              style={[
                styles.stepPill,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <Text style={[Fonts.caption, { color: colors.primary }]}>Step 2 of 2</Text>
            </View>
          </Animated.View>

          {/* World + vibe summary strip */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(450)}
            style={styles.summaryStrip}
          >
            <View style={styles.summaryPills}>
              {worldEntry ? (
                <View style={[styles.summaryPill, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[Fonts.caption, { color: colors.primary }]}>
                    {worldEntry.emoji} {worldEntry.name}
                  </Text>
                </View>
              ) : null}
              {vibeEntry ? (
                <View style={[styles.summaryPill, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[Fonts.caption, { color: colors.primary }]}>
                    {vibeEntry.emoji} {vibeEntry.name}
                  </Text>
                </View>
              ) : null}
            </View>
            <Pressable onPress={navigateToWorldPicker} accessibilityRole="button">
              <Ionicons name="pencil-outline" size={14} color={colors.inkMute} />
            </Pressable>
          </Animated.View>

          {/* Title block */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(450)}
            style={styles.titleBlock}
          >
            <Text style={[styles.titleLine1, { color: colors.ink }]}>One last thing,</Text>
            <Text style={[Fonts.serifItalic, { color: colors.primary }]}>
              tell me about your dreamer.
            </Text>
          </Animated.View>

          {/* Form card */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(450)}
            style={[styles.card, { backgroundColor: colors.surface, ...getCardShadow(isDark) }]}
          >
            {/* Field: Name */}
            <Text style={[Fonts.bodyBold, { color: colors.ink, marginBottom: 8 }]}>
              Who's the story for?
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  borderColor: nameFocused ? colors.primary : colors.hair,
                  color: colors.ink,
                },
              ]}
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              placeholder="Child's name"
              placeholderTextColor={colors.inkMute as string}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <View style={[styles.divider, { backgroundColor: colors.hair }]} />

            {/* Field: Age */}
            <Text style={[Fonts.bodyBold, { color: colors.ink, marginBottom: Spacing.sm }]}>
              How old are they?
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.agePills}
            >
              {AppConfig.ageRange.map((a) => {
                const selected = age === a
                return (
                  <Pressable
                    key={a}
                    onPress={() => setAge(a)}
                    style={[
                      styles.agePill,
                      {
                        backgroundColor: selected ? colors.primary : colors.worldCardBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        Fonts.bodyBold,
                        { color: selected ? '#FFFFFF' : colors.ink },
                      ]}
                    >
                      {a}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            <View style={[styles.divider, { backgroundColor: colors.hair }]} />

            {/* Field: Voice */}
            <Text style={[Fonts.bodyBold, { color: colors.ink, marginBottom: Spacing.sm }]}>
              Choose a storyteller voice
            </Text>
            <View style={styles.voiceGrid}>
              {VOICES.map((voice) => {
                const selected = voiceId === voice.id
                return (
                  <Pressable
                    key={voice.id}
                    onPress={() => setVoiceId(voice.id)}
                    style={[
                      styles.voiceTile,
                      {
                        width: VOICE_TILE_WIDTH,
                        backgroundColor: selected ? colors.primary : colors.worldCardBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name="headset-outline"
                      size={20}
                      color={selected ? '#FFFFFF' : (colors.primary as string)}
                    />
                    <Text
                      style={[
                        Fonts.bodyBold,
                        { color: selected ? '#FFFFFF' : colors.ink, marginTop: 6 },
                      ]}
                    >
                      {voice.displayName}
                    </Text>
                    <Text
                      style={[
                        Fonts.caption,
                        {
                          color: selected ? 'rgba(255,255,255,0.8)' : colors.inkMute,
                          marginTop: 2,
                        },
                      ]}
                    >
                      {voice.description}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </Animated.View>

          {/* Bottom spacer for sticky CTA */}
          <View style={styles.ctaSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky CTA */}
      <View style={styles.stickyBar}>
        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.stickyFade}
          pointerEvents="none"
        />
        <View style={[styles.stickyContent, { backgroundColor: colors.background }]}>
          <Pressable
            onPress={handleGenerate}
            disabled={!canGenerate || isGenerating}
            android_ripple={{ color: 'transparent' }}
            shouldRasterizeIOS
            renderToHardwareTextureAndroid
            style={({ pressed }) => ({ opacity: pressed ? 0.82 : canGenerate && !isGenerating ? 1 : 0.5 })}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.primary, '#9B8EC4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.ctaGradient, getLiftShadow(isDark)]}
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={[Fonts.buttonLabel, styles.ctaLabel]}>Weaving your story…</Text>
                </>
              ) : (
                <Text style={[Fonts.buttonLabel, styles.ctaLabel]}>✦  Create My Story</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingBottom: Sizing.buttonHeight + Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 50,
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  summaryPills: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
  },
  titleBlock: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: 4,
  },
  titleLine1: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 28,
    letterSpacing: -0.6,
  },
  card: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radii.cardLarge,
    padding: Spacing.lg,
    gap: 0,
  },
  textInput: {
    height: 52,
    borderRadius: Radii.field,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  agePills: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: Spacing.sm,
  },
  agePill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  voiceTile: {
    borderRadius: Radii.card,
    padding: 14,
    minHeight: 90,
  },
  ctaSpacer: {
    height: Sizing.buttonHeight + Spacing.xxl,
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  stickyFade: {
    height: 60,
  },
  stickyContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  ctaGradient: {
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  ctaLabel: {
    color: '#FFFFFF',
  },
})
