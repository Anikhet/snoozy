import React, { memo } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { formatDistanceToNow } from 'date-fns'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Radii } from '@/config/tokens'
import { Triangle } from '@/components/Triangle'
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

  const gradientStart = isDark
    ? (template?.gradientStartDark ?? '#2E2B4A')
    : (template?.gradientStartLight ?? '#E8E5FF')
  const gradientEnd = isDark
    ? (template?.gradientEndDark ?? '#3B3458')
    : (template?.gradientEndLight ?? '#B8ABE8')

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
          {
            backgroundColor: colors.surface,
            borderColor: colors.hair,
            shadowColor: colors.ink,
          },
        ]}
      >
        {/* Gradient thumb with glyph */}
        <LinearGradient
          colors={[gradientStart, gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.thumb}
        >
          <Text style={styles.thumbGlyph}>
            {template?.glyph ?? '\u263E'}
          </Text>
        </LinearGradient>

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text
            style={[Fonts.serifBody, { color: colors.ink }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <SubtitleView
            status={status}
            childName={childName}
            createdAt={createdAt}
          />
        </View>

        <TrailingAction status={status} />
      </View>
    </Pressable>
  )
})

function SubtitleView({
  status,
  childName,
  createdAt,
}: {
  status: StoryStatus
  childName: string
  createdAt: string
}) {
  const { colors } = useThemeColors()

  if (status === StoryStatus.Generating) {
    return (
      <View style={styles.subtitleRow}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.subtitleText, { color: colors.primary }]}>
          Weaving the story\u2026
        </Text>
      </View>
    )
  }

  if (status === StoryStatus.Failed) {
    return (
      <Text style={[styles.subtitleText, { color: colors.error }]}>
        Didn&apos;t quite come together \u2014 tap to retry
      </Text>
    )
  }

  const relativeDate = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
  })

  return (
    <View style={styles.subtitleRow}>
      <Text style={[styles.subtitleText, { color: colors.inkSoft }]}>
        For {childName}
      </Text>
      <View style={[styles.bulletDot, { backgroundColor: colors.inkMute }]} />
      <Text style={[styles.subtitleText, { color: colors.inkSoft }]}>
        {relativeDate}
      </Text>
    </View>
  )
}

function TrailingAction({ status }: { status: StoryStatus }) {
  const { colors } = useThemeColors()

  if (status === StoryStatus.Generating) {
    return (
      <View style={styles.actionCircle}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    )
  }

  if (status === StoryStatus.Ready) {
    return (
      <View
        style={[styles.actionCircle, { backgroundColor: colors.primarySoft }]}
      >
        <Triangle size={12} color={colors.primary} />
      </View>
    )
  }

  return (
    <View
      style={[
        styles.actionCircle,
        { backgroundColor: colors.error + '1F' },
      ]}
    >
      <Ionicons name="refresh" size={16} color={colors.error} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radii.card,
    gap: 16,
    borderWidth: 1,
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbGlyph: {
    fontSize: 22,
    fontFamily: 'PlayfairDisplay_400Regular',
    color: '#FFFFFF',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subtitleText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Nunito_400Regular',
  },
  bulletDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  actionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
