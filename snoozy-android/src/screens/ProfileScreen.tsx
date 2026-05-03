import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'

export function ProfileScreen() {
  const { colors } = useThemeColors()
  const childDetails = useStoryStore((s) => s.childDetails)
  const childName = childDetails.name || 'Dreamer'

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[Fonts.serifTitle, { color: colors.ink }]}>Profile</Text>
      </View>

      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="person" size={40} color={colors.primary as string} />
        </View>
        <Text style={[Fonts.serifHeadline, { color: colors.ink, marginTop: Spacing.md }]}>
          {childName}
        </Text>
        <Text style={[Fonts.body, { color: colors.inkSoft, marginTop: 4 }]}>
          Story Dreamer
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
