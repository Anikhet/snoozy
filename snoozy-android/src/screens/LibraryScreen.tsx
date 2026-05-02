import React, { useCallback, useMemo, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColors } from '@/hooks/useThemeColors'
import {
  Fonts,
  Radii,
  Spacing,
  getCardShadow,
} from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { Story, StoryStatus } from '@/types/story'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const COLUMN_GAP = Spacing.sm
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - COLUMN_GAP) / 2

const CARD_GRADIENTS: [string, string][] = [
  ['#E8E5FF', '#B8ABE8'],
  ['#FBE1CC', '#F4C7A0'],
  ['#D7ECDD', '#B6D6BF'],
  ['#D4E4F0', '#B9D0E5'],
  ['#F6DCE1', '#E9B5C1'],
  ['#DCD5F1', '#B8ABE8'],
]

type FilterKey = 'all' | 'favorites'
type SortKey = 'recent' | 'az'

function StoryCard({
  story,
  index,
  onPlay,
  onFavorite,
}: {
  story: Story
  index: number
  onPlay: (story: Story) => void
  onFavorite: (id: string) => void
}) {
  const { colors, isDark } = useThemeColors()
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length]
  const date = new Date(story.createdAt).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(400)}
      style={[styles.card, getCardShadow(isDark), { backgroundColor: colors.surface }]}
    >
      {/* Thumbnail */}
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.thumbnail} />

      {/* Favorite button */}
      <Pressable
        style={styles.favoriteBtn}
        onPress={() => onFavorite(story.id)}
        accessibilityRole="button"
        accessibilityLabel={story.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Ionicons
          name={story.isFavorite ? 'heart' : 'heart-outline'}
          size={16}
          color={story.isFavorite ? '#E9A97A' : (colors.inkMute as string)}
        />
      </Pressable>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={[Fonts.bodyBold, { color: colors.ink, fontSize: 13 }]} numberOfLines={2}>
          {story.title}
        </Text>
        <Text style={[Fonts.caption, { color: colors.inkMute, marginTop: 2 }]}>{date}</Text>
      </View>

      {/* Play button */}
      {story.status === StoryStatus.Ready ? (
        <Pressable
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          onPress={() => onPlay(story)}
          accessibilityRole="button"
          accessibilityLabel="Play story"
        >
          <Ionicons name="play" size={14} color="#FFFFFF" />
        </Pressable>
      ) : (
        <View style={[styles.playBtn, { backgroundColor: colors.hair }]}>
          <Ionicons
            name={story.status === StoryStatus.Failed ? 'alert-circle-outline' : 'hourglass-outline'}
            size={14}
            color={colors.inkMute as string}
          />
        </View>
      )}
    </Animated.View>
  )
}

export function LibraryScreen() {
  const { colors } = useThemeColors()
  const savedStories = useStoryStore((s) => s.savedStories)
  const playStory = useStoryStore((s) => s.playStory)
  const toggleFavorite = useStoryStore((s) => s.toggleFavorite)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('recent')

  const filtered = useMemo(() => {
    let result = savedStories

    if (filter === 'favorites') result = result.filter((s) => s.isFavorite)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (s) => s.title.toLowerCase().includes(q) || s.childName.toLowerCase().includes(q),
      )
    }

    if (sort === 'az') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    }

    return result
  }, [savedStories, filter, search, sort])

  const handlePlay = useCallback(
    (story: Story) => {
      playStory(story)
    },
    [playStory],
  )

  const handleFavorite = useCallback(
    (id: string) => {
      toggleFavorite(id)
    },
    [toggleFavorite],
  )

  const renderItem = useCallback(
    ({ item, index }: { item: Story; index: number }) => (
      <StoryCard
        story={item}
        index={index}
        onPlay={handlePlay}
        onFavorite={handleFavorite}
      />
    ),
    [handlePlay, handleFavorite],
  )

  const keyExtractor = useCallback((item: Story) => item.id, [])

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'favorites', label: '♥ Favorites' },
  ]

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[Fonts.serifTitle, { color: colors.ink }]}>Library</Text>
              <Pressable
                onPress={() => setSort((s) => (s === 'recent' ? 'az' : 'recent'))}
                style={[styles.sortBtn, { backgroundColor: colors.surface }]}
                accessibilityRole="button"
                accessibilityLabel={`Sort by ${sort === 'recent' ? 'A-Z' : 'recent'}`}
              >
                <Ionicons
                  name={sort === 'recent' ? 'time-outline' : 'text-outline'}
                  size={16}
                  color={colors.inkSoft as string}
                />
                <Text style={[Fonts.caption, { color: colors.inkSoft }]}>
                  {sort === 'recent' ? 'Recent' : 'A–Z'}
                </Text>
              </Pressable>
            </View>

            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.hair }]}>
              <Ionicons name="search-outline" size={16} color={colors.inkMute as string} />
              <TextInput
                style={[Fonts.body, styles.searchInput, { color: colors.ink }]}
                placeholder="Search stories…"
                placeholderTextColor={colors.inkMute as string}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>

            {/* Filter pills */}
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: filter === f.key ? colors.primary : colors.surface,
                      borderColor: filter === f.key ? colors.primary : colors.hair,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === f.key }}
                >
                  <Text
                    style={[
                      Fonts.caption,
                      { color: filter === f.key ? '#FFFFFF' : colors.inkSoft },
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
              <Text style={[Fonts.caption, { color: colors.inkMute, marginLeft: 'auto' }]}>
                {filtered.length} {filtered.length === 1 ? 'story' : 'stories'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Image
              source={require('../../assets/images/mascot-resting.png')}
              style={styles.emptyMascot}
              resizeMode="contain"
            />
            <Text style={[Fonts.serifItalic, { color: colors.inkMute, textAlign: 'center' }]}>
              {filter === 'favorites' ? 'No favorites yet' : 'No stories yet'}
            </Text>
            <Text style={[Fonts.caption, { color: colors.inkMute, textAlign: 'center', marginTop: 4 }]}>
              {filter === 'favorites'
                ? 'Tap the heart on any story to save it here'
                : 'Your stories will appear here after you create them'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  listContent: {
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
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.small,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.field,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 50,
    borderWidth: 1,
  },
  columnWrapper: {
    gap: COLUMN_GAP,
    marginBottom: COLUMN_GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Radii.card,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: CARD_WIDTH * 0.65,
  },
  favoriteBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: Spacing.sm,
    paddingBottom: 0,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    margin: Spacing.sm,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyMascot: {
    width: SCREEN_WIDTH * 0.45,
    aspectRatio: 1,
  },
})
