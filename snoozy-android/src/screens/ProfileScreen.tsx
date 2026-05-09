import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import * as ImagePicker from 'expo-image-picker'
import { copyAsync, documentDirectory } from 'expo-file-system/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@clerk/clerk-expo'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useBackHandler } from '@/hooks/useBackHandler'
import { Fonts, Radii, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'
import { VOICES } from '@/config/voices'
import { VoiceProfile } from '@/types/voice'
import { CHILD_PROFILE_KEY } from '@/screens/ChildProfileScreen'
import { BEDTIME_KEY, formatBedtime, BedtimeValue } from '@/screens/BedtimeReminderScreen'
import { FAVORITE_WORLDS_KEY } from '@/screens/FavoriteThemesScreen'
import { isActive, formatExpiry } from '@/services/subscriptionService'
import {
  requestNotificationPermission,
  cancelBedtimeNotification,
} from '@/services/notificationService'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const AVATAR_STORAGE_KEY = 'snoozy_profile_avatar'
const NOTIFICATIONS_KEY = 'snoozy_notifications'

const HELP_URL = 'https://snoozy.app/help'
const SUPPORT_EMAIL = 'mailto:hello@snoozy.app'

// ─── SettingsRow ─────────────────────────────────────────────────────────────

function SettingsRow({
  title,
  icon,
  rightText,
  rightElement,
  onPress,
  disabled = false,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  rightText?: string
  rightElement?: React.ReactNode
  onPress?: () => void
  disabled?: boolean
}) {
  const showChevron = !rightElement && !!onPress
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.settingsRow,
        { backgroundColor: pressed && onPress ? '#F8F7FF' : 'transparent' },
      ]}
    >
      <Ionicons name={icon} size={22} color="#7B5EA7" style={styles.settingsIcon} />
      <Text style={styles.settingsTitle}>{title}</Text>
      {rightElement ?? (
        <>
          {rightText ? <Text style={styles.settingsRightText}>{rightText}</Text> : null}
          {showChevron ? <Ionicons name="chevron-forward" size={18} color="#C4B6D8" /> : null}
        </>
      )}
    </Pressable>
  )
}

// ─── VoiceProfileCard ────────────────────────────────────────────────────────

function VoiceProfileCard({
  profile,
  isActive,
  onSelect,
  onDelete,
}: {
  profile: VoiceProfile
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <Pressable
      onPress={onSelect}
      onLongPress={() =>
        Alert.alert(
          `Delete "${profile.name}"?`,
          'This voice will be removed. Stories already generated will still play.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ]
        )
      }
      delayLongPress={400}
      style={({ pressed }) => [
        styles.voiceCard,
        isActive ? styles.voiceCardSelected : styles.voiceCardUnselected,
        { opacity: pressed ? 0.75 : 1 },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${profile.name}, your voice recording`}
    >
      <View style={styles.voiceCardTop}>
        <Ionicons name={isActive ? 'mic' : 'mic-outline'} size={18} color={isActive ? '#5B5BD6' : '#9B8EC4'} />
        {isActive && (
          <View style={styles.voiceCheck}>
            <Ionicons name="checkmark" size={10} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text style={[styles.voiceName, isActive && styles.voiceNameSelected]}>{profile.name}</Text>
      <Text style={[styles.voiceDesc, isActive && styles.voiceDescSelected]}>Your recording</Text>
    </Pressable>
  )
}

// ─── AddVoiceCard ─────────────────────────────────────────────────────────────

function AddVoiceCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.voiceCard, styles.voiceCardSetup, { opacity: pressed ? 0.75 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel="Record a new narrator voice"
    >
      <View style={styles.voiceCardTop}>
        <Ionicons name="mic-outline" size={18} color="#9B8EC4" />
      </View>
      <Text style={styles.voiceName}>Add voice</Text>
      <Text style={styles.voiceDesc}>Tap to record</Text>
    </Pressable>
  )
}

// ─── ProfileScreen ────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const goHome = useStoryStore((s) => s.goHome)
  useBackHandler(goHome)

  const { colors } = useThemeColors()
  const { signOut } = useAuth()

  const childDetails = useStoryStore((s) => s.childDetails)
  const openProfileEdit = useStoryStore((s) => s.openProfileEdit)
  const updateSavedVoice = useStoryStore((s) => s.updateSavedVoice)
  const openProfilePanel = useStoryStore((s) => s.openProfilePanel)
  const voiceProfiles = useStoryStore((s) => s.voiceProfiles)
  const removeVoiceProfile = useStoryStore((s) => s.removeVoiceProfile)
  const subscription = useStoryStore((s) => s.subscription)
  const loadSubscription = useStoryStore((s) => s.loadSubscription)

  const isPlusActive = isActive(subscription)

  const childName = childDetails.name || 'Dreamer'
  const initial = childName.charAt(0).toUpperCase()

  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [bedtime, setBedtime] = useState<BedtimeValue | null>(null)
  const [favoriteWorldCount, setFavoriteWorldCount] = useState(0)

  useEffect(() => {
    ;(async () => {
      const [avatarRaw, notifRaw, bedtimeRaw, worldsRaw] = await Promise.all([
        AsyncStorage.getItem(AVATAR_STORAGE_KEY),
        AsyncStorage.getItem(NOTIFICATIONS_KEY),
        AsyncStorage.getItem(BEDTIME_KEY),
        AsyncStorage.getItem(FAVORITE_WORLDS_KEY),
      ])
      if (avatarRaw) setAvatarUri(avatarRaw)
      if (notifRaw !== null) setNotificationsEnabled(notifRaw === 'true')
      if (bedtimeRaw) setBedtime(JSON.parse(bedtimeRaw))
      if (worldsRaw) setFavoriteWorldCount((JSON.parse(worldsRaw) as string[]).length)
      await loadSubscription()
    })()
  }, [loadSubscription])

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
      const displayUri = destUri + `?t=${Date.now()}`
      await AsyncStorage.setItem(AVATAR_STORAGE_KEY, displayUri)
      setAvatarUri(displayUri)
    } finally {
      setAvatarLoading(false)
    }
  }, [])

  const handleVoiceSelect = useCallback(async (voiceId: string) => {
    updateSavedVoice(voiceId)
    try {
      const raw = await AsyncStorage.getItem(CHILD_PROFILE_KEY)
      const profile = raw ? JSON.parse(raw) : {}
      await AsyncStorage.setItem(CHILD_PROFILE_KEY, JSON.stringify({ ...profile, voiceId }))
    } catch {}
  }, [updateSavedVoice])

  const handleNotificationsToggle = useCallback(async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission()
      if (!granted) {
        Alert.alert(
          'Notifications blocked',
          'Please enable notifications for Snoozy in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        )
        return
      }
      setNotificationsEnabled(true)
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, 'true')
    } else {
      setNotificationsEnabled(false)
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, 'false')
      await cancelBedtimeNotification()
    }
  }, [])

  const handleLogout = useCallback(async () => {
    await signOut()
  }, [signOut])

  const bioParts: string[] = []
  if (childDetails.favoriteColor) bioParts.push(childDetails.favoriteColor)
  if (childDetails.favoriteAnimal) bioParts.push(childDetails.favoriteAnimal)
  if (childDetails.favoriteThing) bioParts.push(childDetails.favoriteThing)

  let bio = 'Loves magical adventures and bedtime stories 💜'
  if (bioParts.length === 1) bio = `Loves ${bioParts[0]} and magical adventures 💜`
  else if (bioParts.length === 2) bio = `Loves ${bioParts[0]} and ${bioParts[1]} 💜`
  else if (bioParts.length >= 3) bio = `Loves ${bioParts.slice(0, -1).join(', ')} and ${bioParts[bioParts.length - 1]} 💜`

  const ageText = childDetails.age ? `Age ${childDetails.age}` : 'Age 6'
  const AVATAR_SIZE = SCREEN_WIDTH < 380 ? 64 : 72
  const bedtimeDisplay = bedtime ? formatBedtime(bedtime) : undefined
  const worldsDisplay = favoriteWorldCount > 0 ? `${favoriteWorldCount} selected` : undefined

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + Spacing.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ─────────────────────────────────────────── */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.headerSubtitle}>
                Manage your details & your little one's preferences.
              </Text>
            </View>
            <Animated.Image
              entering={FadeIn.delay(200).duration(800)}
              source={require('../../assets/images/mascot-heart.png')}
              style={styles.headerMascot}
              resizeMode="contain"
            />
          </Animated.View>

          <View style={styles.content}>
            {/* ── User Details Card ──────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
              <View style={[styles.card, { backgroundColor: colors.surface, marginTop: Spacing.lg }]}>
                <View style={styles.userCardContent}>
                  <View style={styles.avatarContainer}>
                    <Pressable onPress={handlePickAvatar}>
                      <View style={[styles.avatarRing, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}>
                        {avatarUri ? (
                          <Image source={{ uri: avatarUri }} style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }} />
                        ) : (
                          <Text style={[Fonts.serifTitle, styles.avatarInitial, { fontSize: AVATAR_SIZE * 0.45 }]}>{initial}</Text>
                        )}
                        {avatarLoading && (
                          <View style={styles.avatarOverlay}>
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  </View>
                  <View style={styles.userDetails}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>{childName}</Text>
                      <Pressable
                        onPress={openProfileEdit}
                        style={({ pressed }) => [styles.editButton, { opacity: pressed ? 0.6 : 1 }]}
                      >
                        <Ionicons name="create-outline" size={16} color="#7B5EA7" />
                        <Text style={styles.editButtonText}>Edit</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.userMeta}>{ageText}  •  She/Her</Text>
                    <Text style={styles.userBio}>{bio}</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* ── Snoozy Plus Banner ─────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              {isPlusActive ? (
                <Pressable
                  onPress={() => openProfilePanel('snoozyPlus')}
                  style={({ pressed }) => [
                    styles.card,
                    styles.plusBanner,
                    { backgroundColor: '#F9F4FF', opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={styles.plusIconContainer}>
                    <Ionicons name="star" size={24} color="#F5C518" />
                  </View>
                  <View style={styles.plusContent}>
                    <View style={styles.plusTitleRow}>
                      <Text style={styles.plusTitle}>Snoozy Plus</Text>
                      <View style={[styles.plusBadge, styles.plusBadgeActive]}>
                        <View style={styles.plusActiveDot} />
                        <Text style={[styles.plusBadgeText, styles.plusBadgeTextActive]}>Active</Text>
                      </View>
                    </View>
                    <Text style={styles.plusSubtitle}>
                      {subscription.expiresAt
                        ? `Renews ${formatExpiry(subscription.expiresAt)}`
                        : 'Magical stories, unlimited dreams.'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#C4B6D8" />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => openProfilePanel('snoozyPlus')}
                  style={({ pressed }) => [
                    styles.card,
                    styles.plusBanner,
                    styles.plusBannerUpgrade,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <LinearGradient
                    colors={[colors.primary, '#9B8EC4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.plusIconContainerDark}>
                    <Ionicons name="star" size={24} color="#F5C518" />
                  </View>
                  <View style={styles.plusContent}>
                    <View style={styles.plusTitleRow}>
                      <Text style={styles.plusTitleDark}>Snoozy Plus</Text>
                      <View style={styles.plusBadgeNew}>
                        <Text style={styles.plusBadgeNewText}>UPGRADE</Text>
                      </View>
                    </View>
                    <Text style={styles.plusSubtitleDark}>Unlock unlimited magic ✨</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.45)" />
                </Pressable>
              )}
            </Animated.View>

            {/* ── Account Section ────────────────────────────── */}
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, padding: 0, overflow: 'hidden' }]}>
              <SettingsRow
                title="Account details"
                icon="person-outline"
                onPress={() => openProfilePanel('accountDetails')}
              />
              <View style={styles.settingsDivider} />
              <SettingsRow
                title="Password & security"
                icon="lock-closed-outline"
                onPress={() => openProfilePanel('passwordSecurity')}
              />
              <View style={styles.settingsDivider} />
              <SettingsRow
                title="Notifications"
                icon="notifications-outline"
                rightElement={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={handleNotificationsToggle}
                    trackColor={{ false: '#E0D9F0', true: '#BDB9F8' }}
                    thumbColor={notificationsEnabled ? '#5B5BD6' : '#FFFFFF'}
                    ios_backgroundColor="#E0D9F0"
                  />
                }
              />
            </View>

            {/* ── Preferences Section ────────────────────────── */}
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, padding: 0, overflow: 'hidden' }]}>
              <SettingsRow
                title="Bedtime reminder"
                icon="alarm-outline"
                rightText={bedtimeDisplay}
                onPress={() => openProfilePanel('bedtimeReminder')}
              />
              <View style={styles.settingsDivider} />
              <SettingsRow
                title="Story preferences"
                icon="sparkles-outline"
                onPress={() => openProfilePanel('storyPrefs')}
              />
              <View style={styles.settingsDivider} />
              <SettingsRow
                title="Favourite worlds"
                icon="earth-outline"
                rightText={worldsDisplay}
                onPress={() => openProfilePanel('favoriteThemes')}
              />
            </View>

            {/* ── Narrator Voice ─────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(250).duration(500)}>
              <Text style={styles.sectionTitle}>Narrator Voice</Text>
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.voiceGrid}>
                  <AddVoiceCard onPress={() => openProfilePanel('voiceSetup')} />
                  {voiceProfiles.map((profile) => (
                    <VoiceProfileCard
                      key={profile.id}
                      profile={profile}
                      isActive={childDetails.voiceId === profile.modelId}
                      onSelect={() => handleVoiceSelect(profile.modelId)}
                      onDelete={() => removeVoiceProfile(profile.id)}
                    />
                  ))}
                  {VOICES.map((v) => {
                    const selected = childDetails.voiceId === v.id
                    return (
                      <Pressable
                        key={v.id}
                        onPress={() => handleVoiceSelect(v.id)}
                        style={({ pressed }) => [
                          styles.voiceCard,
                          selected ? styles.voiceCardSelected : styles.voiceCardUnselected,
                          { opacity: pressed ? 0.75 : 1 },
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${v.displayName}, ${v.description}`}
                      >
                        <View style={styles.voiceCardTop}>
                          <Ionicons
                            name={selected ? 'volume-high' : 'volume-medium-outline'}
                            size={18}
                            color={selected ? '#5B5BD6' : '#9B8EC4'}
                          />
                          {selected && (
                            <View style={styles.voiceCheck}>
                              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.voiceName, selected && styles.voiceNameSelected]}>
                          {v.displayName}
                        </Text>
                        <Text style={[styles.voiceDesc, selected && styles.voiceDescSelected]}>
                          {v.description}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            </Animated.View>

            {/* ── Support Section ────────────────────────────── */}
            <Text style={styles.sectionTitle}>Support</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, padding: 0, overflow: 'hidden' }]}>
              <SettingsRow
                title="Help center"
                icon="help-circle-outline"
                onPress={() => Linking.openURL(HELP_URL)}
              />
              <View style={styles.settingsDivider} />
              <SettingsRow
                title="Contact us"
                icon="mail-outline"
                onPress={() => Linking.openURL(SUPPORT_EMAIL)}
              />
            </View>

            {/* ── Footer ─────────────────────────────────────── */}
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [styles.logoutButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="log-out-outline" size={20} color="#E57373" />
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>

            <Text style={styles.versionText}>Version 1.0.0 (Build 42) ✨</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgImage: { ...StyleSheet.absoluteFillObject },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    position: 'relative',
  },
  headerTextContainer: {
    flex: 1,
    paddingTop: 12,
    paddingRight: 120,
  },
  headerTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: SCREEN_WIDTH < 380 ? 28 : 32,
    color: '#4B367C',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: 'Nunito_500Medium',
    fontSize: SCREEN_WIDTH < 380 ? 13 : 15,
    color: '#7B6B9E',
    lineHeight: SCREEN_WIDTH < 380 ? 18 : 22,
  },
  headerMascot: {
    width: 180,
    height: 180,
    position: 'absolute',
    right: -10,
    top: 10,
  },
  content: { paddingHorizontal: Spacing.lg },
  card: {
    borderRadius: 24,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#F0EBFF',
  },
  userCardContent: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { marginRight: Spacing.md, alignItems: 'center', gap: Spacing.sm },
  avatarRing: {
    backgroundColor: '#E8E5FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: { color: '#7B5EA7' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: { flex: 1, justifyContent: 'center', marginRight: Spacing.sm },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  userName: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: '#4B367C' },
  userMeta: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#7B6B9E', marginBottom: 4 },
  userBio: { fontFamily: 'Nunito_500Medium', fontSize: 13, color: '#7B6B9E', lineHeight: 18 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    backgroundColor: '#F0EBFF',
  },
  editButtonText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#7B5EA7' },
  plusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: '#F0EBFF',
  },
  plusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6DDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusContent: { flex: 1, justifyContent: 'center' },
  plusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  plusTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#4B367C' },
  plusBadge: { backgroundColor: '#DCD5F1', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  plusBadgeText: { fontFamily: 'Nunito_700Bold', fontSize: 10, color: '#7B5EA7', textTransform: 'uppercase' },
  plusSubtitle: { fontFamily: 'Nunito_500Medium', fontSize: 13, color: '#7B6B9E' },
  sectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: '#4B367C',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    paddingHorizontal: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  settingsIcon: { marginRight: Spacing.md },
  settingsTitle: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: '#5C4D7D' },
  settingsRightText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#9A8A92', marginRight: Spacing.sm },
  settingsDivider: { height: 1, backgroundColor: '#F3F0F8', marginLeft: 54, marginRight: Spacing.md },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    paddingVertical: 16,
    borderRadius: Radii.button,
    gap: 8,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  logoutText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#E57373' },
  versionText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: '#9A8A92',
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    opacity: 0.8,
  },
  voiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  voiceCard: { width: '47.5%', borderRadius: 16, padding: Spacing.md, borderWidth: 1.5 },
  voiceCardSelected: { backgroundColor: '#EDE9FF', borderColor: '#5B5BD6' },
  voiceCardUnselected: { backgroundColor: '#F9F7FF', borderColor: '#E8E2F8' },
  voiceCardSetup: { backgroundColor: '#FAFAFE', borderColor: '#C4B6D8', borderStyle: 'dashed' },
  voiceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  voiceCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#5B5BD6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceName: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#4B367C', marginBottom: 2 },
  voiceNameSelected: { color: '#3730A3' },
  voiceDesc: { fontFamily: 'Nunito_500Medium', fontSize: 12, color: '#9B8EC4' },
  voiceDescSelected: { color: '#5B5BD6' },

  // ── Plus banner variants ───────────────────────────────────────────────────
  plusBannerUpgrade: {
    overflow: 'hidden',
    borderColor: 'transparent',
  },
  plusIconContainerDark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusTitleDark: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#FFFFFF' },
  plusBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(76,175,125,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,125,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  plusActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF7D',
  },
  plusBadgeTextActive: { color: '#4CAF7D' },
  plusBadgeNew: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  plusBadgeNewText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  plusSubtitleDark: { fontFamily: 'Nunito_500Medium', fontSize: 13, color: 'rgba(255,255,255,0.75)' },
})
