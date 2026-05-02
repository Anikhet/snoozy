import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing, getCardShadow } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { Screen } from '@/types/navigation'

export const TAB_BAR_HEIGHT = 72
const FAB_SIZE = 52
const TAB_SCREENS: Screen[] = [Screen.Home, Screen.Library, Screen.Insights]

type TabDef = { screen: Screen; icon: string; label: string }

const TABS: TabDef[] = [
  { screen: Screen.Home, icon: 'home', label: 'Home' },
  { screen: Screen.Library, icon: 'bookmarks', label: 'Library' },
  { screen: Screen.Insights, icon: 'bar-chart', label: 'Insights' },
]

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
    >
      <Ionicons
        name={(isActive ? tab.icon : `${tab.icon}-outline`) as never}
        size={22}
        color={isActive ? (colors.primary as string) : (colors.inkMute as string)}
      />
      <Text style={[Fonts.caption, { color: isActive ? colors.primary : colors.inkMute, marginTop: 2 }]}>
        {tab.label}
      </Text>
    </Pressable>
  )
}

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
    else navigateTo(Screen.Home)
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={styles.root}
    >
      {/* FAB — floats above center */}
      <View style={styles.fabWrapper} pointerEvents="box-none">
        <Pressable
          onPress={navigateToWorldPicker}
          accessibilityRole="button"
          accessibilityLabel="Create a story"
        >
          <LinearGradient
            colors={[colors.primary, '#9B8EC4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.fab, getCardShadow(isDark)]}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>

      {/* Bar */}
      <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.hair }]}>
        {TABS.map((tab) => (
          <TabButton
            key={tab.screen}
            tab={tab}
            isActive={currentScreen === tab.screen}
            onPress={() => handleTabPress(tab.screen)}
          />
        ))}
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  fabWrapper: {
    position: 'absolute',
    top: -(FAB_SIZE / 2),
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    height: TAB_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
})
