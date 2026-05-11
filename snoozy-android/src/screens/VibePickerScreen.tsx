import React, { useState } from 'react'
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@clerk/clerk-expo'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useBackHandler } from '@/hooks/useBackHandler'
import { BackSwipeZone } from '@/components/BackSwipeZone'
import { Colors, Fonts, Radii, Sizing, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { VIBES, WORLDS } from '@/config/storyOptions'


export default function VibePickerScreen() {
  const { colors } = useThemeColors()
  const { getToken } = useAuth()
  const backToWorldPicker = useStoryStore((s) => s.backToWorldPicker)
  const generateStory = useStoryStore((s) => s.generateStory)
  const selectedWorldId = useStoryStore((s) => s.selectedWorldId)
  const childDetails = useStoryStore((s) => s.childDetails)

  useBackHandler(backToWorldPicker)

  const [selectedVibeId, setSelectedVibeId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const selectedWorld = WORLDS.find((w) => w.id === selectedWorldId)
  const childName = childDetails.name || 'your little one'

  const handleCreate = () => {
    if (!selectedVibeId || isGenerating) return
    setIsGenerating(true)
    generateStory(selectedVibeId, getToken)
    setIsGenerating(false)
  }

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../assets/images/bg-loading.png')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', `${colors.background}55`, `${colors.background}FF`]}
          locations={[0, 0.2, 0.4]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <BackSwipeZone onBack={backToWorldPicker} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.stepPill, { backgroundColor: colors.primarySoft }]}>
            <Text style={[Fonts.caption, { color: colors.primary }]}>Step 2 of 2</Text>
          </View>
        </View>

        {/* World summary chip */}
        {selectedWorld ? (
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.worldChipRow}>
            <Pressable
              onPress={backToWorldPicker}
              style={[styles.worldChip, { backgroundColor: colors.primarySoft }]}
              accessibilityRole="button"
              accessibilityLabel="Edit world selection"
            >
              <Text style={styles.worldChipEmoji}>{selectedWorld.emoji}</Text>
              <Text style={[Fonts.caption, { color: colors.inkSoft }]}>
                World: {selectedWorld.name}
              </Text>
              <Text style={[Fonts.caption, { color: colors.primary }]}>  Edit</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.titleBlock}>
          <Text style={styles.title}>Tonight's mood</Text>
          <Text style={[Fonts.body, { color: colors.inkSoft, textAlign: 'center', marginTop: Spacing.sm }]}>
            What feeling should the story leave{' '}
            <Text style={{ fontFamily: 'Nunito_700Bold', color: colors.ink }}>{childName}</Text>
            {' '}with?
          </Text>
        </Animated.View>

        {/* Vibe list */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.vibeList}>
          {VIBES.map((vibe, index) => {
            const selected = selectedVibeId === vibe.id
            return (
              <Animated.View
                key={vibe.id}
                entering={FadeInDown.delay(150 + index * 60).duration(400)}
              >
                <Pressable
                  onPress={() => setSelectedVibeId(vibe.id)}
                  style={[
                    styles.vibeRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: selected ? colors.primary : 'transparent',
                      borderWidth: 2,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  {/* Emoji container */}
                  <View style={[styles.emojiContainer, { backgroundColor: vibe.emojiBg }]}>
                    <Text style={styles.vibeEmoji}>{vibe.emoji}</Text>
                  </View>

                  {/* Text */}
                  <View style={styles.vibeText}>
                    <Text style={[styles.vibeName, { color: selected ? colors.primary : colors.ink }]}>
                      {vibe.name}
                    </Text>
                    <Text style={[Fonts.body, { color: colors.inkSoft, fontSize: 13, marginTop: 2 }]}>
                      {vibe.description}
                    </Text>
                  </View>

                  {/* Radio / checkmark */}
                  {selected ? (
                    <View style={[styles.radioSelected, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={[styles.radioEmpty, { borderColor: colors.hair }]} />
                  )}
                </Pressable>
              </Animated.View>
            )
          })}
        </Animated.View>

        <View style={styles.ctaSpacer} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.stickyBar}>
        <LinearGradient
          colors={['transparent', colors.background]}
          style={styles.stickyFade}
          pointerEvents="none"
        />
        <View style={[styles.stickyContent, { backgroundColor: colors.background }]}>
          <Pressable
            onPress={handleCreate}
            disabled={!selectedVibeId || isGenerating}
            android_ripple={{ color: 'transparent' }}
            shouldRasterizeIOS
            renderToHardwareTextureAndroid
            style={({ pressed }) => ({
              opacity: pressed ? 0.82 : selectedVibeId && !isGenerating ? 1 : 0.5,
              borderRadius: Radii.button,
            })}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[colors.primary, Colors.light.primaryMuted]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={[Fonts.buttonLabel, { color: '#FFFFFF' }]}>
                {isGenerating ? 'Creating…' : '✦  Create story'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgImage: { ...StyleSheet.absoluteFillObject },
  safe: { flex: 1 },
  scroll: { paddingBottom: Sizing.buttonHeight + Spacing.xxl },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  stepPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 50 },
  worldChipRow: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  worldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 50,
  },
  worldChipEmoji: { fontSize: 16 },
  titleBlock: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 32,
    color: Colors.light.purpleMid,
    textAlign: 'center',
  },
  vibeList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  vibeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.card,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  emojiContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vibeEmoji: { fontSize: 32 },
  vibeText: { flex: 1 },
  vibeName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
  },
  radioEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    flexShrink: 0,
  },
  radioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ctaSpacer: { height: Sizing.buttonHeight + Spacing.xxl },
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  stickyFade: { height: 60 },
  stickyContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  ctaGradient: {
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
