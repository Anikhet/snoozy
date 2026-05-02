import React, { memo, useCallback, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useThemeColors } from '@/hooks/useThemeColors'

interface WaveformScrubberProps {
  progress: number
  onSeek: (progress: number) => void
  isNight: boolean
  containerWidth: number
}

const DAY_BARS = 48
const NIGHT_BARS = 56
const BAR_SPACING = 2
const SCRUBBER_HEIGHT = 40

/** Deterministic amplitude for bar at index i. */
function getAmplitude(i: number, totalBars: number): number {
  const t = i / totalBars
  return 0.2 + 0.8 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.2))
    * (0.5 + 0.5 * Math.sin(t * Math.PI))
}

/** Pre-computed bar dimension styles (stable across renders). */
function buildBarDimensions(totalBars: number, barWidth: number) {
  return Array.from({ length: totalBars }, (_, i) => {
    const height = Math.max(4, getAmplitude(i, totalBars) * SCRUBBER_HEIGHT)
    return { width: barWidth, height, borderRadius: height / 2 }
  })
}

const WaveformBar = memo(function WaveformBar({
  dimensions,
  backgroundColor,
}: {
  dimensions: { width: number; height: number; borderRadius: number }
  backgroundColor: string
}) {
  return <View style={[dimensions, { backgroundColor }]} />
})

export function WaveformScrubber({
  progress,
  onSeek,
  isNight,
  containerWidth,
}: WaveformScrubberProps) {
  const { colors } = useThemeColors()
  const totalBars = isNight ? NIGHT_BARS : DAY_BARS
  const barWidth = Math.max(2, (containerWidth - (totalBars - 1) * BAR_SPACING) / totalBars)
  const activeIndex = Math.floor(progress * totalBars)

  const activeColor = isNight ? colors.nightInk : colors.primary
  const inactiveColor = isNight
    ? 'rgba(242,237,227,0.22)'
    : 'rgba(43,33,48,0.14)'

  const barDimensions = useMemo(
    () => buildBarDimensions(totalBars, barWidth),
    [totalBars, barWidth]
  )

  const handleSeek = useCallback((x: number) => {
    const clamped = Math.max(0, Math.min(1, x / containerWidth))
    onSeek(clamped)
  }, [containerWidth, onSeek])

  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onStart((e) => handleSeek(e.x))
    .onUpdate((e) => handleSeek(e.x))

  const tapGesture = Gesture.Tap()
    .onEnd((e) => handleSeek(e.x))

  const composed = Gesture.Race(panGesture, tapGesture)

  return (
    <GestureDetector gesture={composed}>
      <View style={[styles.container, { width: containerWidth }]}>
        {barDimensions.map((dims, i) => (
          <WaveformBar
            key={i}
            dimensions={dims}
            backgroundColor={i <= activeIndex ? activeColor : inactiveColor}
          />
        ))}
      </View>
    </GestureDetector>
  )
}

const styles = StyleSheet.create({
  container: {
    height: SCRUBBER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: BAR_SPACING,
  },
})
