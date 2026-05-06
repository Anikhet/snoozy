import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

interface BackSwipeZoneProps {
  onBack: () => void
}

/**
 * Invisible 20px zone anchored to the left edge of its parent.
 * A rightward pan starting here triggers onBack — providing iOS-style
 * edge-swipe-back without React Navigation.
 *
 * Works alongside Android system back gestures (those fire BackHandler instead).
 */
export function BackSwipeZone({ onBack }: BackSwipeZoneProps) {
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(5)
        .failOffsetY([-15, 15])
        .onEnd((e) => {
          if (e.translationX > 80 || e.velocityX > 500) {
            runOnJS(onBack)()
          }
        }),
    [onBack],
  )

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.zone} />
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  zone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
    zIndex: 999,
  },
})
