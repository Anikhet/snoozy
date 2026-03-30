import React, { memo } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatDistanceToNow } from 'date-fns'
import { useThemeColors } from '@/hooks/useThemeColors'
import { AppIcon } from '@/components/AppIcon'
import { Fonts, Spacing, Radii, getCardShadow } from '@/config/tokens'
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
  const iconName = template?.icon ?? 'book'
  const isDisabled = status === StoryStatus.Generating

  const iconColor =
    status === StoryStatus.Failed ? colors.error : colors.secondary

  function handlePress() {
    if (status === StoryStatus.Ready) onPlay(id)
    else if (status === StoryStatus.Failed) onRetry(id)
  }

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={() => onDelete(id)}
      disabled={isDisabled}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: colors.surface },
          getCardShadow(isDark),
        ]}
      >
        <View style={styles.iconFrame}>
          <AppIcon name={iconName} size={20} color={iconColor} />
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[Fonts.headline, { color: colors.textPrimary }]}
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
        <Text style={[Fonts.caption, { color: colors.primary }]}>
          Generating...
        </Text>
      </View>
    )
  }

  if (status === StoryStatus.Failed) {
    return (
      <Text style={[Fonts.caption, { color: colors.error }]}>
        Tap to retry
      </Text>
    )
  }

  const relativeDate = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
  })

  return (
    <Text style={[Fonts.caption, { color: colors.textSecondary }]}>
      For {childName} {'\u2022'} {relativeDate}
    </Text>
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
    return <ActivityIndicator size="small" color={colors.primary} />
  }

  if (status === StoryStatus.Ready) {
    return (
      <View
        style={[
          styles.actionCircle,
          { backgroundColor: colors.primary + '1F' },
        ]}
      >
        <Ionicons name="play" size={16} color={colors.primary} />
      </View>
    )
  }

  return (
    <View
      style={[styles.actionCircle, { backgroundColor: colors.error + '1F' }]}
    >
      <Ionicons name="refresh" size={16} color={colors.error} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.small,
    gap: Spacing.md,
  },
  iconFrame: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
