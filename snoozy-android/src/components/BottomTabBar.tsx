import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Spacing, getLiftShadow } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { Screen } from '@/types/navigation'

// ─── Layout constants ──────────────────────────────────────────────────────────
export const TAB_BAR_HEIGHT = 112

const FAB_SIZE = 56
const FAB_RING = 4          // background-colour ring separating FAB from pill
const PILL_HEIGHT = 64
const PILL_MARGIN_H = 16    // pill distance from screen left / right edges
const PILL_MARGIN_B = 16    // pill distance from safe-area bottom

// FAB sits deeper into the pill — roughly 60% inside, 40% above
const FAB_BOTTOM = PILL_MARGIN_B + PILL_HEIGHT - FAB_SIZE * 1
// ───────────────────────────────────────────────────────────────────────────────

const TAB_SCREENS: Screen[] = [Screen.Home, Screen.Library, Screen.Insights, Screen.Profile]

type TabDef = { screen: Screen; icon: string; label: string }

// Left section and right section are symmetric (2 tabs each) with the FAB centred
const LEFT_TABS: TabDef[] = [
  { screen: Screen.Home, icon: 'home', label: 'Home' },
  { screen: Screen.Library, icon: 'bookmarks', label: 'Library' },
]
const RIGHT_TABS: TabDef[] = [
  { screen: Screen.Insights, icon: 'bar-chart', label: 'Insights' },
  { screen: Screen.Profile, icon: 'person', label: 'Profile' },
]

// ─── Tab button ────────────────────────────────────────────────────────────────
function TabButton({
  tab,
  isActive,
  onPress,
}: {
  tab: TabDef
  isActive: boolean
  onPress: () => void
}) {
  const { colors } = useThemeColors()
  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: isActive }}
      android_ripple={{ color: 'transparent' }}
    >
      {isActive ? (
        <LinearGradient
          colors={[colors.primary, '#9B8EC4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconChip}
        >
          <Ionicons name={tab.icon as never} size={20} color="#FFFFFF" />
        </LinearGradient>
      ) : (
        <View style={styles.iconChip}>
          <Ionicons name={`${tab.icon}-outline` as never} size={20} color={colors.inkMute as string} />
        </View>
      )}
      <Text
        style={[
          styles.tabLabel,
          { color: isActive ? colors.primary : colors.inkMute },
          isActive && styles.tabLabelActive,
        ]}
        numberOfLines={1}
      >
        {tab.label}
      </Text>
    </Pressable>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export function BottomTabBar() {
  const { colors, isDark } = useThemeColors()
  const currentScreen = useStoryStore((s) => s.currentScreen)
  const navigateTo = useStoryStore((s) => s.navigateTo)
  const navigateToLibrary = useStoryStore((s) => s.navigateToLibrary)
  const navigateToInsights = useStoryStore((s) => s.navigateToInsights)
  const navigateToWorldPicker = useStoryStore((s) => s.navigateToWorldPicker)

  if (!TAB_SCREENS.includes(currentScreen)) return null

  function handleTabPress(screen: Screen) {
    if (screen === Screen.Library) navigateToLibrary()
    else if (screen === Screen.Insights) navigateToInsights()
    else navigateTo(screen)
  }

  // Soft all-around glow — floats the pill off the background
  const pillShadow = isDark
    ? {
        shadowColor: '#000000',
        shadowOpacity: 0.55,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 4 },
        elevation: 16,
      }
    : {
        shadowColor: '#2B1E30',
        shadowOpacity: 0.11,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 4 },
        elevation: 14,
      }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.root}
      pointerEvents="box-none"
    >
      {/* ── Floating pill ── */}
      <View
        style={[
          styles.pill,
          { backgroundColor: colors.surface, borderColor: colors.hair },
          pillShadow,
        ]}
      >
        {/* Left: Home + Library */}
        <View style={styles.tabSection}>
          {LEFT_TABS.map((tab) => (
            <TabButton
              key={tab.screen}
              tab={tab}
              isActive={currentScreen === tab.screen}
              onPress={() => handleTabPress(tab.screen)}
            />
          ))}
        </View>

        {/* Centre gap — the FAB floats above this space */}
        <View style={styles.fabSlot} />

        {/* Right: Insights + Profile */}
        <View style={styles.tabSection}>
          {RIGHT_TABS.map((tab) => (
            <TabButton
              key={tab.screen}
              tab={tab}
              isActive={currentScreen === tab.screen}
              onPress={() => handleTabPress(tab.screen)}
            />
          ))}
        </View>
      </View>

      {/* ── FAB — centred, half-above pill ── */}
      <View style={styles.fabWrapper} pointerEvents="box-none">
        <Pressable
          onPress={navigateToWorldPicker}
          accessibilityRole="button"
          accessibilityLabel="Create a story"
          android_ripple={{ color: 'transparent' }}
          style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
        >
          {/* Background-colour ring separates FAB from the pill beneath it */}
          <View style={[styles.fabRing, { backgroundColor: colors.background }]}>
            <LinearGradient
              colors={[colors.primary, '#9B8EC4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.fab, getLiftShadow(isDark)]}
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </LinearGradient>
          </View>
        </Pressable>
      </View>
    </Animated.View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: PILL_MARGIN_H,
    paddingBottom: PILL_MARGIN_B,
    justifyContent: 'flex-end',
  },
  pill: {
    height: PILL_HEIGHT,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.xs,
  },
  tabSection: {
    flex: 1,
    flexDirection: 'row',
  },
  fabSlot: {
    // Width matches the FAB ring + breathing room, keeping pill sections symmetric
    width: FAB_SIZE + FAB_RING * 2 + 16,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: FAB_BOTTOM,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fabRing: {
    borderRadius: (FAB_SIZE + FAB_RING * 2) / 2,
    padding: FAB_RING,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 8,
  },
  iconChip: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'Nunito_400Regular',
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    fontFamily: 'Nunito_700Bold',
  },
})
