import React, { useEffect, useState } from 'react'
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
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFonts } from 'expo-font'
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular'
import { Nunito_500Medium } from '@expo-google-fonts/nunito/500Medium'
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold'
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold'
import { Colors } from '@/config/tokens'
import { Screen } from '@/types/navigation'
import { useStoryStore } from '@/stores/storyStore'
import { configureAudioMode } from '@/services/audioService'
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-expo'
import { tokenCache } from '@/utils/tokenCache'
import { HomeScreen } from '@/screens/HomeScreen'
import { StoryPlayerScreen } from '@/screens/StoryPlayerScreen'
import WorldPickerScreen from './src/screens/WorldPickerScreen'
import StoryConfigScreen from './src/screens/StoryConfigScreen'
import GeneratingScreen from './src/screens/GeneratingScreen'
import StoryEndScreen from './src/screens/StoryEndScreen'
import { LibraryScreen } from '@/screens/LibraryScreen'
import { InsightsScreen } from '@/screens/InsightsScreen'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { SplashScreen } from '@/screens/SplashScreen'
import { AuthScreen } from '@/screens/AuthScreen'
import { ChildProfileScreen, CHILD_PROFILE_KEY } from '@/screens/ChildProfileScreen'
import { BottomTabBar } from '@/components/BottomTabBar'
import { DEV_MODE } from '@/config/appConfig'

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || ''

const TRANSITION_DURATION = 350

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
  })

  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const colors = isDark ? Colors.dark : Colors.light
  const currentScreen = useStoryStore((s) => s.currentScreen)
  const loadSavedStories = useStoryStore((s) => s.loadSavedStories)
  const setOnboardingDefaults = useStoryStore((s) => s.setOnboardingDefaults)

  const [showSplash, setShowSplash] = useState(true)
  const [childProfileState, setChildProfileState] = useState<
    'loading' | 'needed' | 'complete'
  >('loading')

  useEffect(() => {
    configureAudioMode()
    loadSavedStories()

    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem(CHILD_PROFILE_KEY)
        if (raw) {
          const profile = JSON.parse(raw)
          setOnboardingDefaults(profile)
          setChildProfileState('complete')
        } else {
          setChildProfileState('needed')
        }
      } catch {
        setChildProfileState('needed')
      }
    })()
  }, [loadSavedStories, setOnboardingDefaults])

  if (!fontsLoaded || childProfileState === 'loading') return null

  const appScreens = (
    <>
      {currentScreen === Screen.Home ? (
        <Animated.View key="home" style={styles.flex} entering={FadeIn.duration(TRANSITION_DURATION)} exiting={FadeOut.duration(TRANSITION_DURATION)}>
          <HomeScreen />
        </Animated.View>
      ) : null}
      {currentScreen === Screen.Library ? (
        <Animated.View key="library" style={styles.flex} entering={FadeIn.duration(TRANSITION_DURATION)} exiting={FadeOut.duration(TRANSITION_DURATION)}>
          <LibraryScreen />
        </Animated.View>
      ) : null}
      {currentScreen === Screen.Insights ? (
        <Animated.View key="insights" style={styles.flex} entering={FadeIn.duration(TRANSITION_DURATION)} exiting={FadeOut.duration(TRANSITION_DURATION)}>
          <InsightsScreen />
        </Animated.View>
      ) : null}
      {currentScreen === Screen.Profile ? (
        <Animated.View key="profile" style={styles.flex} entering={FadeIn.duration(TRANSITION_DURATION)} exiting={FadeOut.duration(TRANSITION_DURATION)}>
          <ProfileScreen />
        </Animated.View>
      ) : null}
      {currentScreen === Screen.Player ? (
        <Animated.View key="player" style={styles.flex} entering={SlideInDown.duration(TRANSITION_DURATION)} exiting={FadeOut.duration(TRANSITION_DURATION)}>
          <StoryPlayerScreen />
        </Animated.View>
      ) : null}
      {currentScreen === Screen.WorldPicker ? (
        <Animated.View key="worldPicker" style={styles.flex} entering={SlideInRight.duration(TRANSITION_DURATION)} exiting={SlideOutLeft.duration(TRANSITION_DURATION)}>
          <WorldPickerScreen />
        </Animated.View>
      ) : null}
      {currentScreen === Screen.StoryConfig ? (
        <Animated.View key="storyConfig" style={styles.flex} entering={SlideInRight.duration(TRANSITION_DURATION)} exiting={SlideOutLeft.duration(TRANSITION_DURATION)}>
          <StoryConfigScreen />
        </Animated.View>
      ) : null}
      {currentScreen === Screen.Generating ? (
        <Animated.View key="generating" style={styles.flex} entering={FadeIn.duration(TRANSITION_DURATION)} exiting={FadeOut.duration(TRANSITION_DURATION)}>
          <GeneratingScreen />
        </Animated.View>
      ) : null}
      {currentScreen === Screen.StoryEnd ? (
        <Animated.View key="storyEnd" style={styles.flex} entering={FadeIn.duration(TRANSITION_DURATION)} exiting={FadeOut.duration(TRANSITION_DURATION)}>
          <StoryEndScreen />
        </Animated.View>
      ) : null}
      <BottomTabBar />
    </>
  )

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <View style={[styles.flex, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <SafeAreaView style={styles.flex}>
              {showSplash ? (
                <SplashScreen onFinish={() => setShowSplash(false)} />
              ) : (
                <>
                  {!DEV_MODE && <SignedOut><AuthScreen /></SignedOut>}
                  {!DEV_MODE ? (
                    <SignedIn>
                      {childProfileState === 'needed' ? (
                        <Animated.View
                          key="childProfile"
                          style={styles.flex}
                          entering={FadeIn.duration(TRANSITION_DURATION)}
                          exiting={FadeOut.duration(TRANSITION_DURATION)}
                        >
                          <ChildProfileScreen
                            onFinish={() => setChildProfileState('complete')}
                          />
                        </Animated.View>
                      ) : appScreens}
                    </SignedIn>
                  ) : appScreens}
                </>
              )}
            </SafeAreaView>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
})
