import React, { useState, useCallback } from 'react'
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, Fonts, Radii, Sizing, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { useBackHandler } from '@/hooks/useBackHandler'
import { BackSwipeZone } from '@/components/BackSwipeZone'
import { CHILD_PROFILE_KEY } from '@/screens/ChildProfileScreen'

function FieldInput({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  returnKeyType = 'next',
  onSubmitEditing,
}: {
  label: string
  placeholder: string
  value: string
  onChangeText: (text: string) => void
  icon: keyof typeof Ionicons.glyphMap
  returnKeyType?: 'next' | 'done'
  onSubmitEditing?: () => void
}) {
  const [focused, setFocused] = useState(false)
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, { borderColor: focused ? '#5B5BD6' : 'rgba(91,91,214,0.18)' }]}>
        <Ionicons name={icon} size={18} color={Colors.light.primaryMuted} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B0A5CC"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="words"
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={40}
        />
      </View>
    </View>
  )
}

export function StoryPreferencesScreen() {
  const closeProfilePanel = useStoryStore((s) => s.closeProfilePanel)
  const childDetails = useStoryStore((s) => s.childDetails)
  const updateChildDetails = useStoryStore((s) => s.updateChildDetails)

  useBackHandler(closeProfilePanel)

  const [color, setColor] = useState(childDetails.favoriteColor ?? '')
  const [animal, setAnimal] = useState(childDetails.favoriteAnimal ?? '')
  const [thing, setThing] = useState(childDetails.favoriteThing ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    const updates = {
      favoriteColor: color.trim() || undefined,
      favoriteAnimal: animal.trim() || undefined,
      favoriteThing: thing.trim() || undefined,
    }
    updateChildDetails(updates)
    try {
      const raw = await AsyncStorage.getItem(CHILD_PROFILE_KEY)
      const profile = raw ? JSON.parse(raw) : {}
      await AsyncStorage.setItem(CHILD_PROFILE_KEY, JSON.stringify({ ...profile, ...updates }))
    } catch {}
    setSaving(false)
    closeProfilePanel()
  }, [saving, color, animal, thing, updateChildDetails, closeProfilePanel])

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
            <Ionicons name="chevron-back" size={22} color={Colors.light.purpleMid} />
          </Pressable>
          <Text style={styles.headerTitle}>Story Preferences</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.heroBlock}>
              <Text style={styles.heroEmoji}>✨</Text>
              <Text style={styles.heroTitle}>Personalise the magic</Text>
              <Text style={[Fonts.body, styles.heroSubtitle]}>
                These details weave into every story we create
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(160).duration(420)} style={styles.card}>
              <FieldInput
                label="Favourite colour"
                placeholder="e.g. purple, ocean blue…"
                value={color}
                onChangeText={setColor}
                icon="color-palette-outline"
                returnKeyType="next"
              />
              <View style={styles.divider} />
              <FieldInput
                label="Favourite animal"
                placeholder="e.g. bunny, dragon, penguin…"
                value={animal}
                onChangeText={setAnimal}
                icon="paw-outline"
                returnKeyType="next"
              />
              <View style={styles.divider} />
              <FieldInput
                label="Favourite thing"
                placeholder="e.g. space, dinosaurs, baking…"
                value={thing}
                onChangeText={setThing}
                icon="heart-outline"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(220).duration(420)} style={styles.hintRow}>
              <Ionicons name="sparkles-outline" size={14} color={Colors.light.primaryMuted} />
              <Text style={[Fonts.caption, styles.hintText]}>
                All fields are optional — fill in what fits
              </Text>
            </Animated.View>

            <View style={styles.ctaSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Sticky CTA */}
        <View style={styles.ctaBar}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1, borderRadius: Radii.button })}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#5B5BD6', Colors.light.primaryMuted]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaLabel}>{saving ? 'Saving…' : 'Save preferences'}</Text>
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
  flex: { flex: 1 },
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
    color: Colors.light.purpleMid,
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
    marginBottom: Spacing.lg,
  },
  heroEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  heroTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 26,
    color: Colors.light.purpleDeep,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    color: Colors.light.purpleSoft,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.cardLarge,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F0EBFF',
  },
  fieldLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: Colors.light.purpleMid,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: Radii.field,
    paddingHorizontal: Spacing.md,
    height: 48,
    backgroundColor: '#F7F5FF',
  },
  input: {
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: Colors.light.purpleDeep,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(91,91,214,0.08)',
    marginVertical: Spacing.md,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  hintText: { color: Colors.light.primaryMuted },
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
    color: '#FFFFFF',
  },
})
