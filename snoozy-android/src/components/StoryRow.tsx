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
import { Fonts, Radii, Spacing } from '@/config/tokens'
import { StoryStatus } from '@/types/story'
import { StoryCoverTile } from '@/components/StoryCoverTile'

interface StoryRowProps {
  id: string
  title: string
  templateId: string
  childName: string
  createdAt: string
  status: StoryStatus
  voiceName?: string
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
  voiceName,
  onPlay,
  onDelete,
  onRetry,
}: StoryRowProps) {
  const { colors } = useThemeColors()
  const isDisabled = status === StoryStatus.Generating

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
          },
        ]}
      >
        <StoryCoverTile
          worldId={templateId}
          title=""
          size="sm"
          borderRadius={16}
          showTitle={false}
          style={styles.thumb}
        />

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
            voiceName={voiceName}
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
  voiceName,
  colors,
}: {
  status: StoryStatus
  childName: string
  createdAt: string
  voiceName?: string
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
      {voiceName && (
        <>
          <View style={[styles.dot, { backgroundColor: colors.inkMute }]} />
          <Text style={[Fonts.caption, { color: colors.inkSoft }]}>{voiceName}</Text>
        </>
      )}
      <View style={[styles.dot, { backgroundColor: colors.inkMute }]} />
      <View style={[styles.aiBadge, { backgroundColor: colors.primarySoft }]}>
        <Text style={[styles.aiBadgeText, { color: colors.primary }]}>✦ AI</Text>
      </View>
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
  },
  thumb: {
    width: 56,
    height: 56,
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
  aiBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 10,
  },
  action: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
