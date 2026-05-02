import React from 'react'
import { useWindowDimensions } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle } from 'react-native-svg'
import { MoonMark } from '@/components/MoonMark'
import { SnoozyStar } from '@/components/SnoozyStar'
import { View, StyleSheet } from 'react-native'

const SCENE_HEIGHT = 280

/** Star positions: [x, y, diameter] */
const STARS: [number, number, number][] = [
  [30, 60, 10], [60, 40, 8], [90, 120, 12], [180, 50, 8],
  [220, 100, 10], [250, 160, 8], [40, 180, 10], [140, 200, 8],
]

/**
 * Day-mode player hero illustration.
 * Gradient sky + 2 bezier hill paths + MoonMark + star dots.
 */
export function CoverScene() {
  const { width: screenWidth } = useWindowDimensions()
  const w = screenWidth - 48
  const h = SCENE_HEIGHT

  const hill1 = [
    `M0,${0.66 * h}`,
    `Q${0.18 * w},${0.33 * h} ${0.35 * w},${0.5 * h}`,
    `Q${0.55 * w},${0.58 * h} ${0.7 * w},${0.46 * h}`,
    `Q${0.85 * w},${0.33 * h} ${w},${0.58 * h}`,
    `L${w},${h} L0,${h} Z`,
  ].join(' ')

  const hill2 = [
    `M0,${0.79 * h}`,
    `Q${0.24 * w},${0.54 * h} ${0.47 * w},${0.7 * h}`,
    `Q${0.76 * w},${0.87 * h} ${w},${0.75 * h}`,
    `L${w},${h} L0,${h} Z`,
  ].join(' ')

  return (
    <View style={[styles.wrapper, { width: w }]}>
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <Defs>
          <LinearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#E6E5FF" />
            <Stop offset="0.5" stopColor="#F0EEFF" />
            <Stop offset="1" stopColor="#FBF5EC" />
          </LinearGradient>
        </Defs>

        {/* Sky background */}
        <Rect x={0} y={0} width={w} height={h} fill="url(#skyGrad)" rx={28} />

        {/* Hill 1 — lighter */}
        <Path d={hill1} fill="rgba(91,91,214,0.35)" />

        {/* Hill 2 — darker */}
        <Path d={hill2} fill="rgba(58,58,168,0.4)" />

        {/* Star dots */}
        {STARS.map(([sx, sy, sd], i) => (
          <Circle
            key={i}
            cx={Math.min(sx, w - 10)}
            cy={sy}
            r={sd / 2}
            fill="rgba(255,255,255,0.8)"
          />
        ))}
      </Svg>

      {/* MoonMark overlay */}
      <View style={styles.moonContainer}>
        <MoonMark size={44} />
      </View>

      {/* SnoozyStar sparkles */}
      <View style={[styles.starOverlay, { left: 30, top: 24 }]}>
        <SnoozyStar size={8} color="rgba(255,255,255,0.8)" />
      </View>
      <View style={[styles.starOverlay, { right: 40, top: 36 }]}>
        <SnoozyStar size={10} color="rgba(255,255,255,0.7)" />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    height: SCENE_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  moonContainer: {
    position: 'absolute',
    top: 30,
    alignSelf: 'center',
  },
  starOverlay: {
    position: 'absolute',
  },
})
