import React, { memo } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { formatDistanceToNow } from 'date-fns'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Radii, Spacing } from '@/config/tokens'
import { StoryStatus } from '@/types/story'
import { TEMPLATES } from '@/config/templates'

interface StoryRowProps {
  id: string
  title: string
  templateId: string
  childName: string
  createdAt: string
  status: StoryStatus
  onPlay: (id: string) => void
  onDelete: (id: string) => void
  onRetry: (id: string) => void
}

export const StoryRow = memo(function StoryRow({
  id,
  title,
  templateId,
  childName,
  createdAt,
  status,
  onPlay,
  onDelete,
  onRetry,
}: StoryRowProps) {
  const { colors, isDark } = useThemeColors()
  const template = TEMPLATES.find((t) => t.id === templateId)
  const isDisabled = status === StoryStatus.Generating

  const gradient = template
    ? isDark
      ? template.gradient.dark
      : template.gradient.light
    : (isDark ? ['#2E2B4A', '#3B3458'] : ['#E8E5FF', '#B8ABE8'])

  function handlePress() {
    if (status === StoryStatus.Ready) onPlay(id)
    else if (status === StoryStatus.Failed) onRetry(id)
  }

  return (
    <Pressable onPress={handlePress} onLongPress={() => onDelete(id)} disabled={isDisabled}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.hair,
            shadowColor: colors.ink,
          },
        ]}
      >
        <View style={styles.thumb}>
          <LinearGradient
            colors={gradient as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[styles.glyph, { color: colors.ink }]}>
            {template?.glyph ?? '\u2726'}
          </Text>
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[Fonts.serifHeadline, { fontSize: 16, color: colors.ink }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <SubtitleView
            status={status}
            childName={childName}
            createdAt={createdAt}
            colors={colors}
          />
        </View>

        <TrailingAction status={status} colors={colors} />
      </View>
    </Pressable>
  )
})

function SubtitleView({
  status,
  childName,
  createdAt,
  colors,
}: {
  status: StoryStatus
  childName: string
  createdAt: string
  colors: ReturnType<typeof useThemeColors>['colors']
}) {
  if (status === StoryStatus.Generating) {
    return (
      <View style={styles.subtitleRow}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[Fonts.caption, { color: colors.primary }]}>Weaving the story…</Text>
      </View>
    )
  }

  if (status === StoryStatus.Failed) {
    return (
      <Text style={[Fonts.caption, { color: colors.error }]} numberOfLines={1}>
        Didn't quite come together — tap to retry
      </Text>
    )
  }

  const relativeDate = formatDistanceToNow(new Date(createdAt), { addSuffix: true })
  return (
    <View style={styles.subtitleRow}>
      <Text style={[Fonts.caption, { color: colors.inkSoft }]}>For {childName}</Text>
      <View style={[styles.dot, { backgroundColor: colors.inkMute }]} />
      <Text style={[Fonts.caption, { color: colors.inkSoft }]}>{relativeDate}</Text>
    </View>
  )
}

function TrailingAction({
  status,
  colors,
}: {
  status: StoryStatus
  colors: ReturnType<typeof useThemeColors>['colors']
}) {
  if (status === StoryStatus.Generating) {
    return <ActivityIndicator size="small" color={colors.primary} style={styles.action} />
  }

  if (status === StoryStatus.Ready) {
    return (
      <View style={[styles.action, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="play" size={14} color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.action, { backgroundColor: colors.error + '1F' }]}>
      <Ionicons name="refresh" size={14} color={colors.error} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radii.card,
    gap: Spacing.md,
    borderWidth: 1,
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 22,
  },
  textContainer: {
    flex: 1,
    gap: 3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  action: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
