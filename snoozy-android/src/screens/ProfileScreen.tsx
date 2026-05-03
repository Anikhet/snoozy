import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import * as ImagePicker from 'expo-image-picker'
import { copyAsync, documentDirectory } from 'expo-file-system/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { DEV_MODE } from '@/config/appConfig'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Radii, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'
import { VOICES } from '@/config/voices'

const AVATAR_STORAGE_KEY = 'snoozy_profile_avatar'

const AGES = Array.from({ length: 12 }, (_, i) => i + 1)

export function ProfileScreen() {
  const { colors } = useThemeColors()
  const { signOut } = useAuth()
  const { user } = useUser()

  const childDetails = useStoryStore((s) => s.childDetails)
  const updateChildDetails = useStoryStore((s) => s.updateChildDetails)
  const savedStories = useStoryStore((s) => s.savedStories)

  const childName = childDetails.name || 'Dreamer'
  const initial = childName.charAt(0).toUpperCase()

  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)

  const [nameValue, setNameValue] = useState(childDetails.name)
  const [colorValue, setColorValue] = useState(childDetails.favoriteColor ?? '')
  const [animalValue, setAnimalValue] = useState(childDetails.favoriteAnimal ?? '')
  const [thingValue, setThingValue] = useState(childDetails.favoriteThing ?? '')

  useEffect(() => {
    AsyncStorage.getItem(AVATAR_STORAGE_KEY).then((uri) => {
      if (uri) setAvatarUri(uri)
    })
  }, [])

  const handlePickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    })

    if (result.canceled || !result.assets[0]) return

    setAvatarLoading(true)
    try {
      const destUri = (documentDirectory ?? '') + 'profile-avatar.jpg'
      await copyAsync({ from: result.assets[0].uri, to: destUri })
      // Cache-bust URI is stored so Image reloads fresh on every remount too
      const displayUri = destUri + `?t=${Date.now()}`
      await AsyncStorage.setItem(AVATAR_STORAGE_KEY, displayUri)
      setAvatarUri(displayUri)
    } finally {
      setAvatarLoading(false)
    }
  }, [])

  const totalStories = savedStories.length
  const favoriteCount = savedStories.filter((s) => s.isFavorite).length
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const thisWeek = savedStories.filter((s) => new Date(s.createdAt).getTime() > weekAgo).length

  const currentVoice = VOICES.find((v) => v.id === childDetails.voiceId) ?? VOICES[0]
  const email = DEV_MODE ? 'dev@snoozy.app' : (user?.primaryEmailAddress?.emailAddress ?? '—')

  const handleLogout = useCallback(async () => {
    await signOut()
  }, [signOut])

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + Spacing.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero ───────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(600)}>
          <LinearGradient
            colors={[colors.primary, '#9B8EC4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Pressable
              onPress={handlePickAvatar}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <View style={styles.avatarRing}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={[Fonts.serifTitle, styles.avatarInitial]}>{initial}</Text>
                )}
                {avatarLoading && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                )}
              </View>
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={12} color="#FFFFFF" />
              </View>
            </Pressable>
            <Text style={[Fonts.serifTitle, styles.heroName]}>{childName}</Text>
            <Text style={[Fonts.body, styles.heroTagline]}>Story Dreamer ✦</Text>
          </LinearGradient>
        </Animated.View>

        <View style={styles.content}>
          {/* ── Stats Row ──────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.statsRow}>
            {[
              { value: totalStories, label: 'STORIES' },
              { value: favoriteCount, label: 'FAVORITES' },
              { value: thisWeek, label: 'THIS WEEK' },
            ].map(({ value, label }) => (
              <View
                key={label}
                style={[styles.statTile, { backgroundColor: colors.surface }]}
              >
                <Text style={[Fonts.serifTitle, { color: colors.primary }]}>{value}</Text>
                <Text style={[Fonts.eyebrow, { color: colors.inkMute, marginTop: 2 }]}>{label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* ── Story Preferences ──────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[Fonts.eyebrow, styles.sectionLabel, { color: colors.inkMute }]}>
                STORY PREFERENCES
              </Text>

              <PrefRow label="NAME">
                <TextInput
                  value={nameValue}
                  onChangeText={setNameValue}
                  onBlur={() => updateChildDetails({ name: nameValue.trim() || childName })}
                  style={[Fonts.body, styles.input, { color: colors.ink }]}
                  placeholderTextColor={colors.inkMute}
                  placeholder="Child's name"
                  returnKeyType="done"
                  autoCorrect={false}
                />
              </PrefRow>

              <RowDivider color={colors.hair} />

              {/* Age picker */}
              <PrefRow label="AGE">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.ageRow}
                >
                  {AGES.map((age) => (
                    <Pressable
                      key={age}
                      onPress={() => updateChildDetails({ age })}
                      style={({ pressed }) => [
                        styles.agePill,
                        {
                          backgroundColor:
                            childDetails.age === age ? colors.primary : colors.primarySoft,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          Fonts.caption,
                          {
                            color: childDetails.age === age ? '#FFFFFF' : colors.primary,
                            fontFamily: 'Nunito_700Bold',
                          },
                        ]}
                      >
                        {age}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </PrefRow>

              <RowDivider color={colors.hair} />

              <PrefRow label="COLOR">
                <TextInput
                  value={colorValue}
                  onChangeText={setColorValue}
                  onBlur={() => updateChildDetails({ favoriteColor: colorValue.trim() })}
                  style={[Fonts.body, styles.input, { color: colors.ink }]}
                  placeholderTextColor={colors.inkMute}
                  placeholder="e.g. purple"
                  returnKeyType="done"
                />
              </PrefRow>

              <RowDivider color={colors.hair} />

              <PrefRow label="ANIMAL">
                <TextInput
                  value={animalValue}
                  onChangeText={setAnimalValue}
                  onBlur={() => updateChildDetails({ favoriteAnimal: animalValue.trim() })}
                  style={[Fonts.body, styles.input, { color: colors.ink }]}
                  placeholderTextColor={colors.inkMute}
                  placeholder="e.g. dragon"
                  returnKeyType="done"
                />
              </PrefRow>

              <RowDivider color={colors.hair} />

              <PrefRow label="FAVE THING">
                <TextInput
                  value={thingValue}
                  onChangeText={setThingValue}
                  onBlur={() => updateChildDetails({ favoriteThing: thingValue.trim() })}
                  style={[Fonts.body, styles.input, { color: colors.ink }]}
                  placeholderTextColor={colors.inkMute}
                  placeholder="e.g. space rockets"
                  returnKeyType="done"
                />
              </PrefRow>
            </View>
          </Animated.View>

          {/* ── Narrator Voice ─────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[Fonts.eyebrow, styles.sectionLabel, { color: colors.inkMute }]}>
                NARRATOR VOICE
              </Text>
              <View style={styles.voiceRow}>
                <View style={[styles.voiceIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="mic" size={18} color={colors.primary as string} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Fonts.bodyBold, { color: colors.ink }]}>
                    {currentVoice.displayName}
                  </Text>
                  <Text style={[Fonts.caption, { color: colors.inkMute, marginTop: 2 }]}>
                    {currentVoice.description}
                  </Text>
                </View>
                <Text style={[Fonts.caption, { color: colors.inkMute, textAlign: 'right' }]}>
                  Change in{'\n'}story setup
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Account ────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[Fonts.eyebrow, styles.sectionLabel, { color: colors.inkMute }]}>
                ACCOUNT
              </Text>

              <View style={styles.accountRow}>
                <Ionicons name="mail-outline" size={18} color={colors.inkMute as string} />
                <Text
                  style={[Fonts.body, { color: colors.inkSoft, flex: 1, marginLeft: Spacing.sm }]}
                  numberOfLines={1}
                >
                  {email}
                </Text>
              </View>

              <RowDivider color={colors.hair} />

              <Pressable
                onPress={handleLogout}
                accessibilityRole="button"
                accessibilityLabel="Log out"
                style={({ pressed }) => [styles.accountRow, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="log-out-outline" size={18} color={colors.error as string} />
                <Text style={[Fonts.bodyBold, { color: colors.error, marginLeft: Spacing.sm }]}>
                  Log Out
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function PrefRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useThemeColors()
  return (
    <View style={styles.prefRow}>
      <Text style={[Fonts.eyebrow, { color: colors.inkMute, width: 84 }]}>{label}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  )
}

function RowDivider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarInitial: {
    color: '#FFFFFF',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  heroName: {
    color: '#FFFFFF',
    marginTop: Spacing.sm,
  },
  heroTagline: {
    color: 'rgba(255,255,255,0.75)',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statTile: {
    flex: 1,
    borderRadius: Radii.card,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  card: {
    borderRadius: Radii.cardLarge,
    padding: Spacing.md,
  },
  sectionLabel: {
    marginBottom: Spacing.md,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44,
  },
  input: {
    flex: 1,
    textAlign: 'right',
    paddingVertical: 0,
  },
  ageRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    justifyContent: 'flex-end',
  },
  agePill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  voiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xs,
  },
})
