import React, { useEffect } from 'react'
import { StyleSheet, View, useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  SlideInDown,
} from 'react-native-reanimated'
import { Colors } from '@/config/tokens'
import { Screen } from '@/types/navigation'
import { useStoryStore } from '@/stores/storyStore'
import { configureAudioMode } from '@/services/audioService'
import { HomeScreen } from '@/screens/HomeScreen'
import { TemplatePickerScreen } from '@/screens/TemplatePickerScreen'
import { StoryFormScreen } from '@/screens/StoryFormScreen'
import { StoryPlayerScreen } from '@/screens/StoryPlayerScreen'

const TRANSITION_DURATION = 350

export default function App() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const colors = isDark ? Colors.dark : Colors.light
  const currentScreen = useStoryStore((s) => s.currentScreen)
  const loadSavedStories = useStoryStore((s) => s.loadSavedStories)

  useEffect(() => {
    configureAudioMode()
    loadSavedStories()
  }, [loadSavedStories])

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <View style={[styles.flex, { backgroundColor: colors.background }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <SafeAreaView style={styles.flex}>
            {currentScreen === Screen.Home ? (
              <Animated.View
                key="home"
                style={styles.flex}
                entering={FadeIn.duration(TRANSITION_DURATION)}
                exiting={FadeOut.duration(TRANSITION_DURATION)}
              >
                <HomeScreen />
              </Animated.View>
            ) : null}

            {currentScreen === Screen.TemplatePicker ? (
              <Animated.View
                key="templatePicker"
                style={styles.flex}
                entering={SlideInRight.duration(TRANSITION_DURATION)}
                exiting={SlideOutLeft.duration(TRANSITION_DURATION)}
              >
                <TemplatePickerScreen />
              </Animated.View>
            ) : null}

            {currentScreen === Screen.StoryForm ? (
              <Animated.View
                key="storyForm"
                style={styles.flex}
                entering={SlideInRight.duration(TRANSITION_DURATION)}
                exiting={SlideOutLeft.duration(TRANSITION_DURATION)}
              >
                <StoryFormScreen />
              </Animated.View>
            ) : null}

            {currentScreen === Screen.Player ? (
              <Animated.View
                key="player"
                style={styles.flex}
                entering={SlideInDown.duration(TRANSITION_DURATION)}
                exiting={FadeOut.duration(TRANSITION_DURATION)}
              >
                <StoryPlayerScreen />
              </Animated.View>
            ) : null}
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
})
