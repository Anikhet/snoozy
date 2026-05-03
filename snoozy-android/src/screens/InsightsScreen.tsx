import React, { useMemo } from 'react'
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native'
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg'
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Radii, Spacing, getCardShadow } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const WORLD_LABELS: Record<string, string> = {
  kingdom: 'Magical Kingdom',
  forest: 'Enchanted Forest',
  space: 'Outer Space',
  ocean: 'Ocean Deep',
  clouds: 'Cloud Kingdom',
  jungle: 'Magical Safari',
}

function ProgressBar({ ratio, color, delay }: { ratio: number; color: string; delay: number }) {
  const width = useSharedValue(0)

  React.useEffect(() => {
    width.value = withDelay(delay, withTiming(ratio, { duration: 700 }))
  }, [ratio])

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.round(width.value * 100)}%` as `${number}%`,
  }))

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, { backgroundColor: color }, barStyle]} />
    </View>
  )
}

export function InsightsScreen() {
  const { colors, isDark } = useThemeColors()
  const savedStories = useStoryStore((s) => s.savedStories)

  const readyStories = useMemo(() => savedStories.filter((s) => s.status === 'ready'), [savedStories])

  const thisWeekCount = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 6)
    cutoff.setHours(0, 0, 0, 0)
    return readyStories.filter((s) => new Date(s.createdAt) >= cutoff).length
  }, [readyStories])

  const streak = useMemo(() => {
    let count = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      if (readyStories.some((s) => s.createdAt.startsWith(dateStr))) {
        count++
      } else {
        break
      }
    }
    return count
  }, [readyStories])

  const weekData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().split('T')[0]
    })
    return days.map((day) => ({
      day,
      label: new Date(day + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1),
      count: readyStories.filter((s) => s.createdAt.startsWith(day)).length,
    }))
  }, [readyStories])

  const vibeBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    readyStories.forEach((s) => {
      counts.set(s.templateId, (counts.get(s.templateId) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        id,
        label: WORLD_LABELS[id] ?? id,
        count,
        ratio: count / Math.max(readyStories.length, 1),
      }))
  }, [readyStories])

  // Chart dimensions
  const CHART_PADDING = Spacing.lg
  const CHART_INNER_WIDTH = SCREEN_WIDTH - CHART_PADDING * 2 - Spacing.lg * 2
  const BAR_GAP = 6
  const BAR_WIDTH = Math.floor((CHART_INNER_WIDTH - BAR_GAP * 6) / 7)
  const CHART_HEIGHT = 90
  const maxCount = Math.max(...weekData.map((d) => d.count), 1)
  const CHART_SVG_WIDTH = 7 * (BAR_WIDTH + BAR_GAP) - BAR_GAP
  const LABEL_HEIGHT = 18

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={[Fonts.serifTitle, { color: colors.ink }]}>Insights</Text>
          <Text style={[Fonts.caption, { color: colors.inkMute }]}>
            {readyStories.length} {readyStories.length === 1 ? 'story' : 'stories'} total
          </Text>
        </Animated.View>

        {/* Stat cards row */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.statsRow} shouldRasterizeIOS renderToHardwareTextureAndroid>
          {/* Hero: total stories */}
          <View style={[styles.heroCard, getCardShadow(isDark), { backgroundColor: colors.primary }]}>
            <Text style={styles.heroNumber}>{readyStories.length}</Text>
            <Text style={styles.heroLabel}>Stories{'\n'}Created</Text>
          </View>

          <View style={styles.statPair}>
            {/* This week */}
            <View style={[styles.statCard, getCardShadow(isDark), { backgroundColor: colors.surface }]}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{thisWeekCount}</Text>
              <Text style={[Fonts.caption, { color: colors.inkMute }]}>This week</Text>
            </View>
            {/* Streak */}
            <View style={[styles.statCard, getCardShadow(isDark), { backgroundColor: colors.surface }]}>
              <Text style={[styles.statNumber, { color: colors.starGold }]}>{streak}</Text>
              <Text style={[Fonts.caption, { color: colors.inkMute }]}>Day streak</Text>
            </View>
          </View>
        </Animated.View>

        {/* Weekly bar chart */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={[styles.section, getCardShadow(isDark), { backgroundColor: colors.surface }]}
          shouldRasterizeIOS
          renderToHardwareTextureAndroid
        >
          <Text style={[Fonts.bodyBold, { color: colors.ink, marginBottom: Spacing.md }]}>
            Last 7 Days
          </Text>
          <View style={styles.chartContainer}>
            <Svg width={CHART_SVG_WIDTH} height={CHART_HEIGHT + LABEL_HEIGHT}>
              {weekData.map((d, i) => {
                const barH = Math.max((d.count / maxCount) * CHART_HEIGHT, d.count > 0 ? 4 : 2)
                const x = i * (BAR_WIDTH + BAR_GAP)
                const isToday = i === 6
                return (
                  <G key={d.day}>
                    <Rect
                      x={x}
                      y={CHART_HEIGHT - barH}
                      width={BAR_WIDTH}
                      height={barH}
                      rx={BAR_WIDTH / 2}
                      fill={
                        d.count > 0
                          ? isToday
                            ? (colors.primary as string)
                            : (colors.primarySoft as string)
                          : (colors.hair as string)
                      }
                    />
                    <SvgText
                      x={x + BAR_WIDTH / 2}
                      y={CHART_HEIGHT + LABEL_HEIGHT - 2}
                      fontSize={10}
                      textAnchor="middle"
                      fill={colors.inkMute as string}
                      fontFamily="Nunito_600SemiBold"
                    >
                      {d.label}
                    </SvgText>
                    {d.count > 0 ? (
                      <SvgText
                        x={x + BAR_WIDTH / 2}
                        y={CHART_HEIGHT - barH - 4}
                        fontSize={9}
                        textAnchor="middle"
                        fill={isToday ? (colors.primary as string) : (colors.inkMute as string)}
                        fontFamily="Nunito_700Bold"
                      >
                        {d.count}
                      </SvgText>
                    ) : null}
                  </G>
                )
              })}
            </Svg>
          </View>
        </Animated.View>

        {/* Vibe breakdown */}
        {vibeBreakdown.length > 0 ? (
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={[styles.section, getCardShadow(isDark), { backgroundColor: colors.surface }]}
            shouldRasterizeIOS
            renderToHardwareTextureAndroid
          >
            <Text style={[Fonts.bodyBold, { color: colors.ink, marginBottom: Spacing.md }]}>
              Favourite Worlds
            </Text>
            {vibeBreakdown.map((v, i) => (
              <View key={v.id} style={styles.vibeRow}>
                <View style={styles.vibeMeta}>
                  <Text style={[Fonts.body, { color: colors.ink }]} numberOfLines={1}>
                    {v.label}
                  </Text>
                  <Text style={[Fonts.caption, { color: colors.inkMute }]}>
                    {v.count} {v.count === 1 ? 'story' : 'stories'}
                  </Text>
                </View>
                <ProgressBar ratio={v.ratio} color={colors.primary as string} delay={i * 80} />
              </View>
            ))}
          </Animated.View>
        ) : null}

        {/* Empty state */}
        {readyStories.length === 0 ? (
          <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.emptyState}>
            <Text style={[Fonts.serifItalic, { color: colors.inkMute, textAlign: 'center' }]}>
              Stats appear once you create your first story
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: TAB_BAR_HEIGHT + Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  heroCard: {
    flex: 1,
    borderRadius: Radii.card,
    padding: Spacing.md,
    backgroundColor: '#5B5BD6',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  heroNumber: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 48,
    color: '#FFFFFF',
    lineHeight: 52,
  },
  heroLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 15,
  },
  statPair: {
    flex: 1,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: Radii.card,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 30,
    lineHeight: 34,
  },
  section: {
    borderRadius: Radii.cardLarge,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  chartContainer: {
    alignItems: 'center',
  },
  vibeRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  vibeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
})
