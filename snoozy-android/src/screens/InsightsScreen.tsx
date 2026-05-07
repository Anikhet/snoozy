import React, { useMemo } from 'react'
import {
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Rect, Text as SvgText } from 'react-native-svg'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useBackHandler } from '@/hooks/useBackHandler'
import { Fonts, Radii, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const CARD_PADDING = Spacing.lg
const CONTENT_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2

// World display config
const WORLD_META: Record<string, { label: string; color: string; bg: string }> = {
  kingdom:  { label: 'Courage',      color: '#7B5BD6', bg: '#EDE8FF' },
  forest:   { label: 'Kindness',     color: '#E07B4A', bg: '#FDE8D8' },
  ocean:    { label: 'Friendship',   color: '#4A90D6', bg: '#DCF0FF' },
  space:    { label: 'Bravery',      color: '#5B3DA8', bg: '#E6E0FF' },
  clouds:   { label: 'Imagination',  color: '#D6884A', bg: '#FDE8CC' },
  jungle:   { label: 'Kindness',     color: '#4AB57B', bg: '#D8F5E8' },
}

function formatMinutes(mins: number) {
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

// ─── Mini bar chart ────────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: { label: string; count: number }[] }) {
  const BAR_W = 14
  const BAR_GAP = 6
  const CHART_H = 44
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const totalW = data.length * (BAR_W + BAR_GAP) - BAR_GAP

  return (
    <Svg width={totalW} height={CHART_H + 14}>
      {data.map((d, i) => {
        const barH = Math.max((d.count / maxCount) * CHART_H, d.count > 0 ? 4 : 2)
        const x = i * (BAR_W + BAR_GAP)
        const isLast = i === data.length - 1
        return (
          <React.Fragment key={d.label + i}>
            <Rect
              x={x} y={CHART_H - barH}
              width={BAR_W} height={barH}
              rx={BAR_W / 2}
              fill={isLast ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
            />
            <SvgText
              x={x + BAR_W / 2} y={CHART_H + 12}
              fontSize={9} textAnchor="middle"
              fill="rgba(255,255,255,0.7)"
              fontFamily="Nunito_600SemiBold"
            >
              {d.label}
            </SvgText>
          </React.Fragment>
        )
      })}
    </Svg>
  )
}

// ─── Highlight card ────────────────────────────────────────────────────────────

function HighlightCard({ icon, iconBg, value, label, delay }: {
  icon: keyof typeof Ionicons.glyphMap
  iconBg: string
  iconColor: string
  value: string
  label: string
  delay: number
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={hlStyles.card}>
      <View style={[hlStyles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color="#FFFFFF" />
      </View>
      <Text style={hlStyles.value}>{value}</Text>
      <Text style={hlStyles.label}>{label}</Text>
    </Animated.View>
  )
}

const hlStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: Radii.card,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  value: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: '#2D1F6E',
    lineHeight: 24,
  },
  label: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    color: '#7B6B9E',
    textAlign: 'center',
    lineHeight: 14,
  },
})

// ─── InsightsScreen ────────────────────────────────────────────────────────────

export function InsightsScreen() {
  const goHome = useStoryStore((s) => s.goHome)
  useBackHandler(goHome)

  const { colors } = useThemeColors()
  const savedStories = useStoryStore((s) => s.savedStories)
  const childDetails = useStoryStore((s) => s.childDetails)

  const childName = childDetails.name || 'Dreamer'

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
      if (readyStories.some((s) => s.createdAt.startsWith(dateStr))) count++
      else break
    }
    return count
  }, [readyStories])

  const weekData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const day = d.toISOString().split('T')[0]
      return {
        label: new Date(day + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }).slice(0, 1),
        count: readyStories.filter((s) => s.createdAt.startsWith(day)).length,
      }
    })
  }, [readyStories])

  const themes = useMemo(() => {
    const counts = new Map<string, number>()
    readyStories.forEach((s) => counts.set(s.templateId, (counts.get(s.templateId) ?? 0) + 1))
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count, meta: WORLD_META[id] ?? { label: id, color: '#7B5BD6', bg: '#EDE8FF' } }))
  }, [readyStories])

  const listeningMins = Math.round(readyStories.length * 13)
  const uniqueWorlds = themes.length
  const streakStars = Math.min(Math.ceil(streak / 2), 5)

  return (
    <ImageBackground
      source={require('../../assets/images/bg-loading.png')}
      style={styles.root}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Header ── */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View>
              <Text style={styles.headerName}>{childName}'s Journey</Text>
            </View>
            <View style={styles.weekPill}>
              <Text style={styles.weekPillText}>This Week</Text>
              <Ionicons name="chevron-down" size={12} color="#7B6B9E" />
            </View>
          </Animated.View>

          {/* ── Hero card: mascot + stats + chart ── */}
          <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.heroRow}>
            {/* Mascot */}
            <Image
              source={require('../../assets/images/mascot-resting.png')}
              style={styles.mascot}
              resizeMode="contain"
            />

            {/* Stat + chart card */}
            <LinearGradient
              colors={['#7B5BD6', '#9B8EC4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroLabel}>Stories Created</Text>
                  <Text style={styles.heroNumber}>{readyStories.length}</Text>
                  <Text style={styles.heroSub}>{thisWeekCount} this week</Text>
                </View>
              </View>
              <MiniBarChart data={weekData} />
            </LinearGradient>
          </Animated.View>

          {/* ── Weekly Highlights ── */}
          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <Text style={styles.sectionTitle}>Weekly Highlights</Text>
            <View style={styles.highlightRow}>
              <HighlightCard
                icon="time-outline"
                iconBg="#7B5BD6"
                iconColor="#FFFFFF"
                value={formatMinutes(listeningMins)}
                label={'Time spent\nlistening'}
                delay={200}
              />
              <HighlightCard
                icon="star-outline"
                iconBg="#F5C842"
                iconColor="#FFFFFF"
                value={String(thisWeekCount)}
                label={'Stories this\nweek'}
                delay={260}
              />
              <HighlightCard
                icon="heart-outline"
                iconBg="#E97A9B"
                iconColor="#FFFFFF"
                value={String(uniqueWorlds)}
                label={'Worlds\nexplored'}
                delay={320}
              />
            </View>
          </Animated.View>

          {/* ── Themes Explored ── */}
          {themes.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(240).duration(400)}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Themes Explored</Text>
                <Text style={styles.seeAll}>See all</Text>
              </View>
              <View style={styles.pillsWrap}>
                {themes.map((t) => (
                  <View key={t.id} style={[styles.themePill, { backgroundColor: t.meta.bg }]}>
                    <Text style={[styles.themePillText, { color: t.meta.color }]}>{t.meta.label}</Text>
                    <Text style={[styles.themePillCount, { color: t.meta.color }]}>{t.count} {t.count === 1 ? 'story' : 'stories'}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : null}

          {/* ── Listening Streak ── */}
          <Animated.View
            entering={FadeInDown.delay(320).duration(400)}
            style={styles.streakCard}
          >
            <Text style={styles.sectionTitle}>Listening Streak</Text>
            <View style={styles.streakRow}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <View style={styles.streakMeta}>
                <Text style={styles.streakLabel}>days in a row! 🌙</Text>
                <View style={styles.starsRow}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Ionicons
                      key={i}
                      name={i < streakStars ? 'star' : 'star-outline'}
                      size={22}
                      color={i < streakStars ? '#F5C842' : '#D9D0EE'}
                    />
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ── Empty state ── */}
          {readyStories.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.empty}>
              <Text style={styles.emptyText}>
                Stats appear once you create your first story ✨
              </Text>
            </Animated.View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#EDE8F8' },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: CARD_PADDING,
    paddingBottom: TAB_BAR_HEIGHT + Spacing.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 32,
    color: '#4B367C',
    marginBottom: 4,
  },
  weekPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  weekPillText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: '#7B6B9E',
  },

  // Hero
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  mascot: {
    width: CONTENT_WIDTH * 0.52,
    height: CONTENT_WIDTH * 0.58,
  },
  heroCard: {
    flex: 1,
    borderRadius: Radii.cardLarge,
    padding: Spacing.md,
    gap: Spacing.sm,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  heroNumber: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 46,
    color: '#FFFFFF',
    lineHeight: 50,
  },
  heroSub: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },

  // Sections
  sectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    color: '#2D1F6E',
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  seeAll: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: '#7B5BD6',
  },

  // Highlights
  highlightRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },

  // Themes
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  themePill: {
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 2,
    alignItems: 'center',
  },
  themePillText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
  },
  themePillCount: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 10,
  },

  // Streak
  streakCard: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: Radii.cardLarge,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  streakNumber: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 56,
    color: '#2D1F6E',
    lineHeight: 60,
  },
  streakMeta: {
    gap: Spacing.sm,
  },
  streakLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: '#7B6B9E',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: '#9B8EC4',
    textAlign: 'center',
    lineHeight: 22,
  },
})
