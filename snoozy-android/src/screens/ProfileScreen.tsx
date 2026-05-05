import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { Fonts, Radii, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const AVATAR_STORAGE_KEY = 'snoozy_profile_avatar'

export function ProfileScreen() {
  const { colors } = useThemeColors()
  const { signOut } = useAuth()

  const childDetails = useStoryStore((s) => s.childDetails)
  const childName = childDetails.name || 'Dreamer'
  const initial = childName.charAt(0).toUpperCase()

  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)

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
      const displayUri = destUri + `?t=${Date.now()}`
      await AsyncStorage.setItem(AVATAR_STORAGE_KEY, displayUri)
      setAvatarUri(displayUri)
    } finally {
      setAvatarLoading(false)
    }
  }, [])

  const handleLogout = useCallback(async () => {
    await signOut()
  }, [signOut])

  // Construct bio from preferences, or use default
  const bioParts = []
  if (childDetails.favoriteColor) bioParts.push(childDetails.favoriteColor)
  if (childDetails.favoriteAnimal) bioParts.push(childDetails.favoriteAnimal)
  if (childDetails.favoriteThing) bioParts.push(childDetails.favoriteThing)
  
  let bio = 'Loves magical adventures and bedtime stories 💜'
  if (bioParts.length > 0) {
    // Format list nicely: A, B and C
    if (bioParts.length === 1) bio = `Loves ${bioParts[0]} and magical adventures 💜`
    else if (bioParts.length === 2) bio = `Loves ${bioParts[0]} and ${bioParts[1]} 💜`
    else bio = `Loves ${bioParts.slice(0, -1).join(', ')} and ${bioParts[bioParts.length - 1]} 💜`
  }

  const ageText = childDetails.age ? `Age ${childDetails.age}` : 'Age 6' // Fallback for UI matching

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
          {/* ── Header ───────────────────────────────────────── */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Profile ✨</Text>
              <Text style={styles.headerSubtitle}>
                Manage your details and{'\n'}your little one's preferences.
              </Text>
            </View>
            <Image 
              source={require('../../assets/images/mascot-heart.png')} 
              style={styles.headerMascot}
              resizeMode="contain"
            />
          </Animated.View>

          <View style={styles.content}>
            {/* ── User Details Card ──────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.userCardContent}>
                  
                  {/* Avatar */}
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatarRing}>
                      {avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                      ) : (
                        <Text style={[Fonts.serifTitle, styles.avatarInitial]}>{initial}</Text>
                      )}
                      {avatarLoading && (
                        <View style={styles.avatarOverlay}>
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Details */}
                  <View style={styles.userDetails}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>{childName}</Text>
                      <Ionicons name="pencil-outline" size={16} color="#7B6B9E" style={{ marginLeft: 4 }} />
                    </View>
                    <Text style={styles.userMeta}>{ageText}  •  She/Her</Text>
                    <Text style={styles.userBio} numberOfLines={2}>{bio}</Text>
                  </View>

                  {/* Edit Button */}
                  <Pressable 
                    onPress={handlePickAvatar}
                    style={({ pressed }) => [
                      styles.editButton,
                      { opacity: pressed ? 0.6 : 1, backgroundColor: '#F0EBFF' }
                    ]}
                  >
                    <Ionicons name="create-outline" size={16} color="#7B5EA7" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>

                </View>
              </View>
            </Animated.View>

            {/* ── Snoozy Plus Banner ─────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
              <View style={[styles.card, styles.plusBanner, { backgroundColor: '#F9F4FF' }]}>
                <View style={styles.plusIconContainer}>
                  <Ionicons name="star" size={20} color="#F5C842" />
                </View>
                <View style={styles.plusContent}>
                  <View style={styles.plusTitleRow}>
                    <Text style={styles.plusTitle}>Snoozy Plus</Text>
                    <View style={styles.plusBadge}>
                      <Text style={styles.plusBadgeText}>Active</Text>
                    </View>
                  </View>
                  <Text style={styles.plusSubtitle}>You're enjoying all premium features.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#7B6B9E" />
              </View>
            </Animated.View>

            {/* ── Settings Sections ──────────────────────────── */}
            
            {/* Account */}
            <Animated.View entering={FadeInDown.delay(300).duration(500)}>
              <Text style={styles.sectionTitle}>Account</Text>
              <View style={[styles.card, { backgroundColor: colors.surface, padding: 0 }]}>
                <SettingsRow icon="person-outline" title="Account details" isFirst />
                <SettingsRow icon="lock-closed-outline" title="Password & security" />
                <SettingsRow icon="notifications-outline" title="Notifications" isLast />
              </View>
            </Animated.View>

            {/* Preferences */}
            <Animated.View entering={FadeInDown.delay(400).duration(500)}>
              <Text style={styles.sectionTitle}>Preferences</Text>
              <View style={[styles.card, { backgroundColor: colors.surface, padding: 0 }]}>
                <SettingsRow icon="moon-outline" title="Bedtime reminder" rightText="8:00 PM" isFirst />
                <SettingsRow icon="book-outline" title="Story preferences" />
                <SettingsRow icon="heart-outline" title="Favorite themes" isLast />
              </View>
            </Animated.View>

            {/* Support */}
            <Animated.View entering={FadeInDown.delay(500).duration(500)}>
              <Text style={styles.sectionTitle}>Support</Text>
              <View style={[styles.card, { backgroundColor: colors.surface, padding: 0 }]}>
                <SettingsRow icon="help-circle-outline" title="Help center" isFirst />
                <SettingsRow icon="chatbubble-outline" title="Contact us" isLast />
              </View>
            </Animated.View>

            {/* ── Log Out Button ─────────────────────────────── */}
            <Animated.View entering={FadeInDown.delay(600).duration(500)}>
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.logoutButton,
                  { opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <Ionicons name="log-out-outline" size={20} color="#E57373" />
                <Text style={styles.logoutText}>Log out</Text>
              </Pressable>
            </Animated.View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function SettingsRow({ 
  icon, 
  title, 
  rightText, 
  isFirst, 
  isLast 
}: { 
  icon: keyof typeof Ionicons.glyphMap
  title: string
  rightText?: string
  isFirst?: boolean
  isLast?: boolean 
}) {
  return (
    <>
      <Pressable style={({ pressed }) => [
        styles.settingsRow,
        { backgroundColor: pressed ? 'rgba(0,0,0,0.02)' : 'transparent' }
      ]}>
        <Ionicons name={icon} size={22} color="#7B6B9E" style={styles.settingsIcon} />
        <Text style={styles.settingsTitle}>{title}</Text>
        {rightText && <Text style={styles.settingsRightText}>{rightText}</Text>}
        <Ionicons name="chevron-forward" size={18} color="#C4B8D8" />
      </Pressable>
      {!isLast && <View style={styles.settingsDivider} />}
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    zIndex: 10,
  },
  headerTextContainer: {
    flex: 1,
    paddingTop: Spacing.md,
    zIndex: 2,
  },
  headerTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 34,
    color: '#2D1F4D',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 15,
    color: '#7B6B9E',
    lineHeight: 22,
  },
  headerMascot: {
    width: 160,
    height: 160,
    position: 'absolute',
    right: -10,
    top: 0,
    zIndex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  card: {
    borderRadius: Radii.cardLarge,
    padding: Spacing.lg,
    shadowColor: '#2D1F4D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarContainer: {
    alignSelf: 'flex-start',
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8E5FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarInitial: {
    color: '#7B5EA7',
    fontSize: 32,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    color: '#2D1F4D',
  },
  userMeta: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: '#7B6B9E',
    marginBottom: 4,
  },
  userBio: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 13,
    color: '#7B6B9E',
    lineHeight: 18,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  editButtonText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: '#7B5EA7',
  },
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
  plusContent: {
    flex: 1,
    justifyContent: 'center',
  },
  plusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  plusTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: '#2D1F4D',
  },
  plusBadge: {
    backgroundColor: '#DCD5F1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  plusBadgeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: '#7B5EA7',
    textTransform: 'uppercase',
  },
  plusSubtitle: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 13,
    color: '#7B6B9E',
  },
  sectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: '#2D1F4D',
    marginBottom: Spacing.sm,
    paddingHorizontal: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 18,
  },
  settingsIcon: {
    marginRight: Spacing.md,
  },
  settingsTitle: {
    flex: 1,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: '#5C4D7D',
  },
  settingsRightText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: '#9A8A92',
    marginRight: Spacing.sm,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#F3F0F8',
    marginLeft: 56,
    marginRight: Spacing.lg,
  },
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
  logoutText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: '#E57373',
  },
})

