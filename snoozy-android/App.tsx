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
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces/400Regular'
import { Fraunces_400Regular_Italic } from '@expo-google-fonts/fraunces/400Regular_Italic'
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium'
import { Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces/500Medium_Italic'
import { Colors } from '@/config/tokens'
import { Screen } from '@/types/navigation'
import { useStoryStore } from '@/stores/storyStore'
import { configureAudioMode } from '@/services/audioService'
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-expo'
import { tokenCache } from '@/utils/tokenCache'
import { HomeScreen } from '@/screens/HomeScreen'
import { TemplatePickerScreen } from '@/screens/TemplatePickerScreen'
import { StoryFormScreen } from '@/screens/StoryFormScreen'
import { StoryPlayerScreen } from '@/screens/StoryPlayerScreen'
import { AuthScreen } from '@/screens/AuthScreen'
import {
  OnboardingScreen,
  ONBOARDING_KEY,
  ONBOARDING_NAME_KEY,
  ONBOARDING_AGE_KEY,
} from '@/screens/OnboardingScreen'

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || ''

const TRANSITION_DURATION = 350

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_500Medium,
    Fraunces_500Medium_Italic,
  })

  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const colors = isDark ? Colors.dark : Colors.light
  const currentScreen = useStoryStore((s) => s.currentScreen)
  const loadSavedStories = useStoryStore((s) => s.loadSavedStories)
  const setOnboardingDefaults = useStoryStore((s) => s.setOnboardingDefaults)

  const [onboardingState, setOnboardingState] = useState<
    'loading' | 'needed' | 'complete'
  >('loading')

  useEffect(() => {
    configureAudioMode()
    loadSavedStories()

    // Check onboarding completion + hydrate persisted child details so the
    // story form pre-fills the name/age each session.
    ;(async () => {
      try {
        const complete = await AsyncStorage.getItem(ONBOARDING_KEY)
        if (complete === 'true') {
          const [name, ageStr] = await Promise.all([
            AsyncStorage.getItem(ONBOARDING_NAME_KEY),
            AsyncStorage.getItem(ONBOARDING_AGE_KEY),
          ])
          if (name) {
            const age = ageStr ? parseInt(ageStr, 10) : 3
            setOnboardingDefaults({ name, age: age > 0 ? age : 3 })
          }
          setOnboardingState('complete')
        } else {
          setOnboardingState('needed')
        }
      } catch {
        setOnboardingState('needed')
      }
    })()
  }, [loadSavedStories, setOnboardingDefaults])

  if (!fontsLoaded || onboardingState === 'loading') return null

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <View style={[styles.flex, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <SafeAreaView style={styles.flex}>
              {onboardingState === 'needed' ? (
                <Animated.View
                  key="onboarding"
                  style={styles.flex}
                  entering={FadeIn.duration(TRANSITION_DURATION)}
                  exiting={FadeOut.duration(TRANSITION_DURATION)}
                >
                  <OnboardingScreen
                    onFinish={() => setOnboardingState('complete')}
                  />
                </Animated.View>
              ) : (
                <>
                  <SignedIn>
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
                  </SignedIn>

                  <SignedOut>
                    <AuthScreen />
                  </SignedOut>
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
