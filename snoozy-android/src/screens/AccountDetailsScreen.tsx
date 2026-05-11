import React from 'react'
import {
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
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useUser } from '@clerk/clerk-expo'
import { Colors, Fonts, Radii, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { useBackHandler } from '@/hooks/useBackHandler'
import { BackSwipeZone } from '@/components/BackSwipeZone'

function InfoRow({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color="#7B5EA7" />
      </View>
      <View style={styles.infoText}>
        <Text style={[Fonts.caption, styles.infoLabel]}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  )
}

function InfoDivider() {
  return <View style={styles.infoDivider} />
}

export function AccountDetailsScreen() {
  const closeProfilePanel = useStoryStore((s) => s.closeProfilePanel)
  useBackHandler(closeProfilePanel)

  const { user } = useUser()

  const email = user?.primaryEmailAddress?.emailAddress ?? '—'
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—'
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en', { month: 'long', year: 'numeric' })
    : '—'
  const authMethod = user?.externalAccounts?.[0]?.provider
    ? user.externalAccounts[0].provider.charAt(0).toUpperCase() + user.externalAccounts[0].provider.slice(1)
    : 'Email'

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
          <Text style={styles.headerTitle}>Account Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Animated.View entering={FadeInDown.delay(80).duration(420)} style={styles.heroBlock}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase() || '?'}</Text>
            </View>
            <Text style={styles.heroName}>{name}</Text>
            <View style={[styles.badge, { backgroundColor: '#EDE9FF' }]}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#5B5BD6" />
              <Text style={styles.badgeText}>Verified account</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(420)} style={styles.card}>
            <Text style={styles.sectionLabel}>Account info</Text>
            <InfoRow label="Full name" value={name} icon="person-outline" />
            <InfoDivider />
            <InfoRow label="Email address" value={email} icon="mail-outline" />
            <InfoDivider />
            <InfoRow label="Sign-in method" value={authMethod} icon="log-in-outline" />
            <InfoDivider />
            <InfoRow label="Member since" value={memberSince} icon="calendar-outline" />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).duration(420)} style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.light.primaryMuted} />
            <Text style={[Fonts.caption, styles.noteText]}>
              To update your email address or delete your account, please contact our support team.
            </Text>
          </Animated.View>
        </ScrollView>
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
    color: Colors.light.purpleMid,
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  heroBlock: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8E5FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D0C9F0',
  },
  avatarInitial: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 32,
    color: '#5B5BD6',
  },
  heroName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
    color: Colors.light.purpleDeep,
    letterSpacing: -0.3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 50,
  },
  badgeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: '#5B5BD6',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.cardLarge,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: '#F0EBFF',
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: Colors.light.primaryMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: { color: Colors.light.primaryMuted, marginBottom: 2 },
  infoValue: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: Colors.light.purpleDeep,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F3F0F8',
    marginLeft: 52 + Spacing.sm,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: Radii.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#F0EBFF',
  },
  noteText: { color: Colors.light.primaryMuted, flex: 1, lineHeight: 18 },
})
