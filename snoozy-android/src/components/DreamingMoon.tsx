import React from 'react'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'

interface DreamingMoonProps {
  size?: number
}

/**
 * Large decorative moon for night-mode player hero.
 * Radial gradient fill, dark vignette, 3 craters, outer glow ring.
 */
export function DreamingMoon({ size = 196 }: DreamingMoonProps) {
  const r = size / 2
  const outerR = size * 0.585 // 1.17x radius

  return (
    <Svg
      width={size * 1.2}
      height={size * 1.2}
      viewBox={`0 0 ${size * 1.2} ${size * 1.2}`}
    >
      <Defs>
        <RadialGradient id="moonFill" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#F9F2E4" />
          <Stop offset="0.5" stopColor="#D9CCB3" />
          <Stop offset="1" stopColor="#8D7B5F" />
        </RadialGradient>
        <RadialGradient
          id="moonVignette"
          cx="75%"
          cy="75%"
          rx="50%"
          ry="50%"
        >
          <Stop offset="0" stopColor="black" stopOpacity="0" />
          <Stop offset="1" stopColor="black" stopOpacity="0.18" />
        </RadialGradient>
      </Defs>

      {/* Outer glow ring */}
      <Circle
        cx={size * 0.6}
        cy={size * 0.6}
        r={outerR}
        fill="none"
        stroke="rgba(249,242,228,0.15)"
        strokeWidth={1}
      />

      {/* Main moon */}
      <Circle
        cx={size * 0.6}
        cy={size * 0.6}
        r={r}
        fill="url(#moonFill)"
      />

      {/* Vignette overlay */}
      <Circle
        cx={size * 0.6}
        cy={size * 0.6}
        r={r}
        fill="url(#moonVignette)"
      />

      {/* Crater 1 — 8% of size */}
      <Circle
        cx={size * 0.72}
        cy={size * 0.42}
        r={size * 0.08}
        fill="rgba(0,0,0,0.08)"
      />
      {/* Crater 2 — 6% */}
      <Circle
        cx={size * 0.42}
        cy={size * 0.72}
        r={size * 0.06}
        fill="rgba(0,0,0,0.09)"
      />
      {/* Crater 3 — 13% */}
      <Circle
        cx={size * 0.62}
        cy={size * 0.65}
        r={size * 0.04}
        fill="rgba(0,0,0,0.1)"
      />
    </Svg>
  )
}
