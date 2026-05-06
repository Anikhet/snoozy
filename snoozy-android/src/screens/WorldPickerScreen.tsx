import React, { useState } from 'react'
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useBackHandler } from '@/hooks/useBackHandler'
import { BackSwipeZone } from '@/components/BackSwipeZone'
import { Fonts, Radii, Sizing, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { WORLDS } from '@/config/storyOptions'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_GAP = 12
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - CARD_GAP) / 2

interface WorldCardProps {
  world: (typeof WORLDS)[number]
  selected: boolean
  onSelect: (id: string) => void
  colors: ReturnType<typeof useThemeColors>['colors']
  index: number
}

function WorldCard({ world, selected, onSelect, colors, index }: WorldCardProps) {
  const scale = useSharedValue(1)
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 60).duration(400)}
      style={{ width: CARD_WIDTH }}
    >
      <Animated.View style={scaleStyle}>
      <Pressable
        onPress={() => onSelect(world.id)}
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 15 }) }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }) }}
        style={[
          styles.worldCard,
          {
            backgroundColor: colors.surface,
            borderColor: selected ? colors.primary : 'transparent',
            borderWidth: 2,
          },
        ]}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
      >
        {/* Checkmark badge */}
        {selected ? (
          <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
        ) : null}

        <Text style={styles.worldEmoji}>{world.emoji}</Text>
        <Text
          style={[styles.worldName, { color: selected ? colors.primary : colors.ink }]}
          numberOfLines={2}
        >
          {world.name}
        </Text>
        <Text style={[Fonts.caption, { color: colors.inkMute, marginTop: 4, textAlign: 'center' }]} numberOfLines={3}>
          {world.subtitle}
        </Text>
      </Pressable>
      </Animated.View>
    </Animated.View>
  )
}

export default function WorldPickerScreen() {
  const { colors } = useThemeColors()
  const goHome = useStoryStore((s) => s.goHome)
  const navigateToVibePicker = useStoryStore((s) => s.navigateToVibePicker)
  const openProfileEdit = useStoryStore((s) => s.openProfileEdit)
  const childDetails = useStoryStore((s) => s.childDetails)
  const onboardingDefaults = useStoryStore((s) => s.onboardingDefaults)

  useBackHandler(goHome)

  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null)


  const displayName = childDetails.name || onboardingDefaults?.name
  const displayAge = childDetails.age || onboardingDefaults?.age

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: colors.background }]}>
      <BackSwipeZone onBack={goHome} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        </View>



        {/* Title block */}
        <Animated.View entering={FadeInDown.delay(100).duration(450)} style={styles.titleBlock}>
          <Text style={styles.title}>Choose a world</Text>
          <Text style={[Fonts.body, { color: colors.inkSoft, textAlign: 'center', marginTop: Spacing.sm }]}>
            Where does tonight's story take place?
          </Text>
        </Animated.View>

        {/* Profile chip */}
        {displayName ? (
          <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.chipRow}>
            <Pressable
              style={[styles.profileChip, { backgroundColor: colors.primarySoft }]}
              onPress={openProfileEdit}
              accessibilityRole="button"
              accessibilityLabel="Edit child profile"
            >
              <Ionicons name="person-outline" size={14} color={colors.inkSoft} />
              <Text style={[Fonts.caption, { color: colors.inkSoft }]}>
                {'  '}For {displayName}
                {displayAge ? ` · Age ${displayAge}` : ''}
                {'  '}
              </Text>
              <Text style={[Fonts.caption, { color: colors.primary }]}>Edit</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {/* World grid */}
        <View style={styles.grid}>
          {WORLDS.map((world, index) => (
            <WorldCard
              key={world.id}
              world={world}
              selected={selectedWorldId === world.id}
              onSelect={setSelectedWorldId}
              colors={colors}
              index={index}
            />
          ))}
        </View>

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
            onPress={() => selectedWorldId && navigateToVibePicker(selectedWorldId)}
            disabled={!selectedWorldId}
            android_ripple={{ color: 'transparent' }}
            shouldRasterizeIOS
            renderToHardwareTextureAndroid
            style={({ pressed }) => ({
              opacity: pressed ? 0.82 : selectedWorldId ? 1 : 0.45,
              borderRadius: Radii.button,
            })}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={selectedWorldId ? [colors.primary, '#9B8EC4'] : [colors.hair, colors.hair]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={[Fonts.buttonLabel, { color: selectedWorldId ? '#FFFFFF' : (colors.inkMute as string) }]}>
                Next
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Sizing.buttonHeight + Spacing.xxl,
  },
  header: {
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

  titleBlock: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 32,
    color: '#4B367C',
    textAlign: 'center',
  },
  chipRow: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 50,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  worldCard: {
    borderRadius: Radii.cardLarge,
    padding: Spacing.md,
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  worldEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  worldName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    textAlign: 'center',
    letterSpacing: -0.2,
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
