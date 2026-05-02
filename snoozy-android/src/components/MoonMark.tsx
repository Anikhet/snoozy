import React from 'react'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'

interface MoonMarkProps {
  size?: number
  color?: string
}

/** Small moon mark with radial gradient and crater dots. */
export function MoonMark({ size = 44, color = '#5B5BD6' }: MoonMarkProps) {
  const r = size / 2

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient
          id="moonGrad"
          cx={`${0.35 * size}`}
          cy={`${0.35 * size}`}
          rx={`${r}`}
          ry={`${r}`}
        >
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.6" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0.6" />
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill="url(#moonGrad)" />
      {/* Crater dots */}
      <Circle
        cx={r * 1.2}
        cy={r * 0.7}
        r={size * 0.06}
        fill="rgba(0,0,0,0.08)"
      />
      <Circle
        cx={r * 0.7}
        cy={r * 1.3}
        r={size * 0.08}
        fill="rgba(0,0,0,0.06)"
      />
    </Svg>
  )
}
