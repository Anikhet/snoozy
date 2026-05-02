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
import { useFonts } from 'expo-font'
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular'
import { Nunito_500Medium } from '@expo-google-fonts/nunito/500Medium'
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold'
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold'
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display/400Regular'
import { PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display/500Medium'
import { PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display/400Regular_Italic'
import { PlayfairDisplay_500Medium_Italic } from '@expo-google-fonts/playfair-display/500Medium_Italic'
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

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || ''

const TRANSITION_DURATION = 350

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_500Medium_Italic,
  })

  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  const colors = isDark ? Colors.dark : Colors.light
  const currentScreen = useStoryStore((s) => s.currentScreen)
  const loadSavedStories = useStoryStore((s) => s.loadSavedStories)

  useEffect(() => {
    configureAudioMode()
    loadSavedStories()
  }, [loadSavedStories])

  if (!fontsLoaded) return null

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <View style={[styles.flex, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <SafeAreaView style={styles.flex}>
              {/* TODO: re-wrap in <SignedIn>/<SignedOut> to re-enable auth gate */}
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
    </ClerkProvider>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
})
