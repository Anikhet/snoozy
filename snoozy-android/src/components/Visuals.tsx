import React from 'react'
import { StyleSheet, Text, View, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts } from '@/config/tokens'

/**
 * A 4-point sparkle rendered as two rotated squares.
 * Uses View transforms only — no SVG dep needed.
 */
export function SnoozyStar({
  size = 8,
  color = '#5B5BD6',
  opacity = 1,
  style,
}: {
  size?: number
  color?: string
  opacity?: number
  style?: ViewStyle
}) {
  const bar: ViewStyle = {
    position: 'absolute',
    backgroundColor: color,
    opacity,
    width: size * 0.22,
    height: size,
    borderRadius: size * 0.11,
    left: size * 0.39,
    top: 0,
  }
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={bar} />
      <View style={[bar, { transform: [{ rotate: '90deg' }] }]} />
    </View>
  )
}

/**
 * Moon mark — a radial-ish gradient circle with subtle crater dots.
 * React Native lacks true radial gradients, so we fake one with layered circles.
 */
export function MoonMark({
  size = 44,
  color = '#5B5BD6',
}: {
  size?: number
  color?: string
}) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
      {/* Highlight (upper-left) */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.12,
          top: size * 0.12,
          width: size * 0.56,
          height: size * 0.56,
          borderRadius: size * 0.3,
          backgroundColor: '#FFFFFF',
          opacity: 0.75,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.22,
          top: size * 0.22,
          width: size * 0.32,
          height: size * 0.32,
          borderRadius: size * 0.18,
          backgroundColor: '#FFFFFF',
          opacity: 0.9,
        }}
      />
      {/* Tiny craters */}
      <View
        style={{
          position: 'absolute',
          left: size * 0.66,
          top: size * 0.58,
          width: size * 0.1,
          height: size * 0.1,
          borderRadius: size * 0.05,
          backgroundColor: color,
          opacity: 0.2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.5,
          top: size * 0.3,
          width: size * 0.05,
          height: size * 0.05,
          borderRadius: size * 0.025,
          backgroundColor: color,
          opacity: 0.25,
        }}
      />
    </View>
  )
}

/**
 * Large moon used by the night player. Warm cream → deep tan with crater shadows.
 */
export function DreamingMoon({ size = 196 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* outer ring */}
      <View
        style={{
          position: 'absolute',
          width: size * 1.17,
          height: size * 1.17,
          borderRadius: (size * 1.17) / 2,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
        }}
      />
      {/* base disc */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#8D7B5F',
          overflow: 'hidden',
        }}
      >
        {/* mid tone */}
        <View
          style={{
            position: 'absolute',
            left: size * 0.05,
            top: size * 0.05,
            width: size * 0.8,
            height: size * 0.8,
            borderRadius: (size * 0.8) / 2,
            backgroundColor: '#D9CCB3',
            opacity: 0.85,
          }}
        />
        {/* highlight */}
        <View
          style={{
            position: 'absolute',
            left: size * 0.16,
            top: size * 0.14,
            width: size * 0.42,
            height: size * 0.42,
            borderRadius: (size * 0.42) / 2,
            backgroundColor: '#F9F2E4',
            opacity: 0.95,
          }}
        />
        {/* craters */}
        <View
          style={{
            position: 'absolute',
            left: size * 0.18,
            top: size * 0.24,
            width: size * 0.09,
            height: size * 0.09,
            borderRadius: size * 0.045,
            backgroundColor: '#000',
            opacity: 0.1,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.58,
            top: size * 0.48,
            width: size * 0.13,
            height: size * 0.13,
            borderRadius: size * 0.065,
            backgroundColor: '#000',
            opacity: 0.08,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.38,
            top: size * 0.68,
            width: size * 0.06,
            height: size * 0.06,
            borderRadius: size * 0.03,
            backgroundColor: '#000',
            opacity: 0.1,
          }}
        />
      </View>
    </View>
  )
}

/**
 * Progress dots used in onboarding.
 */
export function ProgressDots({ step, total = 3 }: { step: number; total?: number }) {
  const { colors } = useThemeColors()
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 3,
            borderRadius: 2,
            width: i === step ? 18 : 6,
            backgroundColor: i === step ? colors.ink : 'rgba(43,33,48,0.18)',
          }}
        />
      ))}
    </View>
  )
}

/**
 * A static waveform scrubber. Bars up to `progress` (0..1) are active.
 */
export function WaveformScrubber({
  progress,
  bars = 48,
  activeColor,
  inactiveColor,
  height = 40,
}: {
  progress: number
  bars?: number
  activeColor: string
  inactiveColor: string
  height?: number
}) {
  const played = Math.floor(bars * progress)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height, gap: 2 }}>
      {Array.from({ length: bars }).map((_, i) => {
        const t = i / bars
        const amp =
          0.2 +
          0.8 *
            Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.2)) *
            (0.5 + 0.5 * Math.sin(t * Math.PI))
        return (
          <View
            key={i}
            style={{
              flex: 1,
              height: Math.max(4, amp * height),
              borderRadius: 2,
              backgroundColor: i <= played ? activeColor : inactiveColor,
            }}
          />
        )
      })}
    </View>
  )
}

/**
 * A pastel illustration placeholder. Two blobs stacked over a gradient,
 * labeled with small mono type in the corner so an illustrator can drop in real art.
 */
export function IllustrationPlaceholder({
  palette,
  label = 'illustration',
  height = 140,
  radius = 20,
}: {
  palette: readonly [string, string, string?]
  label?: string
  height?: number
  radius?: number
}) {
  return (
    <View style={{ height, borderRadius: radius, overflow: 'hidden' }}>
      <LinearGradient
        colors={[palette[1] ?? palette[0], palette[0]]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          position: 'absolute',
          left: -20,
          top: height * 0.3,
          width: height * 0.7,
          height: height * 0.7,
          borderRadius: (height * 0.7) / 2,
          backgroundColor: palette[0],
          opacity: 0.75,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -10,
          top: -10,
          width: height * 0.55,
          height: height * 0.55,
          borderRadius: (height * 0.55) / 2,
          backgroundColor: palette[1] ?? palette[0],
          opacity: 0.75,
        }}
      />
      {palette[2] ? (
        <View
          style={{
            position: 'absolute',
            left: '40%',
            bottom: -10,
            width: height * 0.4,
            height: height * 0.4,
            borderRadius: (height * 0.4) / 2,
            backgroundColor: palette[2],
            opacity: 0.75,
          }}
        />
      ) : null}
      <Text
        style={[
          Fonts.mono,
          {
            position: 'absolute',
            right: 10,
            bottom: 8,
            color: 'rgba(43,33,48,0.45)',
            textTransform: 'uppercase',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

/**
 * The cover scene used by the ambient player — pastel gradient + stars + two hill silhouettes.
 */
export function CoverScene({ height = 280 }: { height?: number }) {
  return (
    <View style={{ height, borderRadius: 28, overflow: 'hidden' }}>
      <LinearGradient
        colors={['#DCD5F1', '#E8E5FF', '#D4E4F0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ position: 'absolute', left: '65%', top: 30 }}>
        <MoonMark size={64} color="#FFFFFF" />
      </View>
      {/* scattered stars */}
      {STAR_POSITIONS.map((p, i) => (
        <View key={i} style={{ position: 'absolute', left: p[0], top: p[1] }}>
          <SnoozyStar size={p[2]} color="#FFFFFF" opacity={0.8} />
        </View>
      ))}
      {/* hills (two translucent overlays) */}
      <View
        style={{
          position: 'absolute',
          bottom: -20,
          left: 0,
          right: 0,
          height: 90,
          borderTopLeftRadius: 100,
          borderTopRightRadius: 140,
          backgroundColor: 'rgba(91,91,214,0.35)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -20,
          left: 0,
          right: 0,
          height: 60,
          borderTopLeftRadius: 140,
          borderTopRightRadius: 80,
          backgroundColor: 'rgba(58,58,168,0.4)',
        }}
      />
      <Text
        style={[
          Fonts.mono,
          {
            position: 'absolute',
            left: 20,
            bottom: 14,
            color: 'rgba(43,33,48,0.5)',
            textTransform: 'uppercase',
          },
        ]}
      >
        cover illustration
      </Text>
    </View>
  )
}

const STAR_POSITIONS: [number, number, number][] = [
  [30, 60, 10],
  [60, 40, 8],
  [90, 120, 12],
  [180, 50, 8],
  [220, 100, 10],
  [250, 160, 8],
  [40, 180, 10],
  [140, 200, 8],
]

/**
 * Hides a Text label visually but keeps the element mounted for Text+Text chains.
 * (Used by legal footers.)
 */
export function hairline(color: string): ViewStyle {
  return { height: 1, backgroundColor: color, flex: 1 }
}
