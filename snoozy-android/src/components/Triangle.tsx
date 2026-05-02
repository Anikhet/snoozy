import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface TriangleProps {
  size: number
  color: string
}

/** Right-pointing triangle play icon. */
export function Triangle({ size, color }: TriangleProps) {
  const w = size
  const h = size * 1.2
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path d={`M0,0 L${w},${h / 2} L0,${h} Z`} fill={color} />
    </Svg>
  )
}
