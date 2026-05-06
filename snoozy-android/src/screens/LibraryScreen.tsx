import React, { useCallback, useMemo, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useBackHandler } from '@/hooks/useBackHandler'
import {
  Fonts,
  Radii,
  Spacing,
} from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { Story, StoryStatus } from '@/types/story'
import { TAB_BAR_HEIGHT } from '@/components/BottomTabBar'
import { StoryCoverTile } from '@/components/StoryCoverTile'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const COLUMN_GAP = Spacing.sm
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - COLUMN_GAP) / 2


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
  const { colors } = useThemeColors()
  const date = new Date(story.createdAt).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(400)}
      style={[styles.card, { backgroundColor: colors.surface }]}
    >
      {/* Thumbnail */}
      <StoryCoverTile title={story.title} worldId={story.templateId} size="md" borderRadius={Radii.card} showTitle={false} style={{ height: CARD_WIDTH }} />

      {/* Favorite button */}
      <Pressable
        style={styles.favoriteBtn}
        onPress={() => onFavorite(story.id)}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
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
          hitSlop={{ top: 7, right: 7, bottom: 7, left: 7 }}
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
  const goHome = useStoryStore((s) => s.goHome)
  useBackHandler(goHome)

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

      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.safe}
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
              <Text style={styles.pageTitle}>Library</Text>
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
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  safe: {
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
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  pageTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 32,
    color: '#4B367C',
    marginBottom: 4,
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
    width: SCREEN_WIDTH * 0.32,
    height: SCREEN_WIDTH * 0.32,
  },
})
