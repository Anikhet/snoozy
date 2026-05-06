import React, { useState, useCallback } from 'react'
import {
  Dimensions,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Fonts, Radii, Sizing, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { useBackHandler } from '@/hooks/useBackHandler'
import { BackSwipeZone } from '@/components/BackSwipeZone'
import { WORLDS } from '@/config/storyOptions'

export const FAVORITE_WORLDS_KEY = 'snoozy_favorite_worlds'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_GAP = 12
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - CARD_GAP) / 2

function WorldCard({
  world,
  selected,
  onToggle,
  index,
}: {
  world: (typeof WORLDS)[number]
  selected: boolean
  onToggle: (id: string) => void
  index: number
}) {
  const scale = useSharedValue(1)
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 50).duration(380)}
      style={{ width: CARD_WIDTH }}
    >
      <Animated.View style={scaleStyle}>
        <Pressable
          onPress={() => onToggle(world.id)}
          onPressIn={() => { scale.value = withSpring(0.96, { damping: 15 }) }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 15 }) }}
          style={[
            styles.worldCard,
            {
              borderColor: selected ? '#5B5BD6' : 'transparent',
              borderWidth: 2,
              backgroundColor: selected ? '#EDE9FF' : '#FFFFFF',
            },
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected }}
        >
          {selected && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.worldEmoji}>{world.emoji}</Text>
          <Text style={[styles.worldName, { color: selected ? '#5B5BD6' : '#2D1F6E' }]} numberOfLines={2}>
            {world.name}
          </Text>
          <Text style={[Fonts.caption, styles.worldSubtitle]} numberOfLines={2}>
            {world.subtitle}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  )
}

export function FavoriteThemesScreen() {
  const closeProfilePanel = useStoryStore((s) => s.closeProfilePanel)
  useBackHandler(closeProfilePanel)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    AsyncStorage.getItem(FAVORITE_WORLDS_KEY).then((raw) => {
      if (raw) setSelectedIds(new Set(JSON.parse(raw) as string[]))
      setLoaded(true)
    })
  }, [])

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      await AsyncStorage.setItem(FAVORITE_WORLDS_KEY, JSON.stringify([...selectedIds]))
    } catch {}
    setSaving(false)
    closeProfilePanel()
  }, [saving, selectedIds, closeProfilePanel])

  if (!loaded) return null

  const count = selectedIds.size

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../assets/images/bg-loading.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(232,226,248,0.55)', 'rgba(248,244,255,0.80)']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <BackSwipeZone onBack={closeProfilePanel} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={closeProfilePanel} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={22} color="#4B367C" />
          </Pressable>
          <Text style={styles.headerTitle}>Favourite Worlds</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.heroBlock}>
            <Text style={styles.heroEmoji}>🗺️</Text>
            <Text style={styles.heroTitle}>Pick your favourites</Text>
            <Text style={[Fonts.body, styles.heroSubtitle]}>
              These worlds will appear first when creating a story
            </Text>
          </Animated.View>

          {count > 0 && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.countPill}>
              <Text style={styles.countPillText}>
                {count} {count === 1 ? 'world' : 'worlds'} selected
              </Text>
            </Animated.View>
          )}

          <View style={styles.grid}>
            {WORLDS.map((world, index) => (
              <WorldCard
                key={world.id}
                world={world}
                selected={selectedIds.has(world.id)}
                onToggle={handleToggle}
                index={index}
              />
            ))}
          </View>

          <View style={styles.ctaSpacer} />
        </ScrollView>

        {/* Sticky CTA */}
        <View style={styles.ctaBar}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1, borderRadius: Radii.button })}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={count > 0 ? ['#5B5BD6', '#9B8EC4'] : ['#D4CEDE', '#D4CEDE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={[styles.ctaLabel, { color: count > 0 ? '#FFFFFF' : '#9B8EC4' }]}>
                {saving ? 'Saving…' : count > 0 ? 'Save favourites' : 'Skip for now'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8E2F8' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    color: '#4B367C',
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Sizing.buttonHeight + Spacing.xxl,
  },
  heroBlock: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  heroEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  heroTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 26,
    color: '#2D1F6E',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: { color: '#7B6B9E', textAlign: 'center' },
  countPill: {
    alignSelf: 'center',
    backgroundColor: '#EDE9FF',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 50,
    marginBottom: Spacing.md,
  },
  countPillText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: '#5B5BD6',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  worldCard: {
    borderRadius: Radii.cardLarge,
    padding: Spacing.md,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#5B5BD6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  worldEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  worldName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: Spacing.xs,
  },
  worldSubtitle: { color: '#9B8EC4', textAlign: 'center' },
  ctaSpacer: { height: Sizing.buttonHeight + Spacing.xxl },
  ctaBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  ctaGradient: {
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
})
