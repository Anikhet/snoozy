import React from 'react'
import Svg, { Path } from 'react-native-svg'

interface SnoozyStarProps {
  size: number
  color: string
  opacity?: number
}

/** 4-point sparkle SVG. */
export function SnoozyStar({ size, color, opacity = 1 }: SnoozyStarProps) {
  const w = size
  const h = size
  const path = [
    `M${0.5 * w},0`,
    `L${0.6 * w},${0.4 * h}`,
    `L${w},${0.5 * h}`,
    `L${0.6 * w},${0.6 * h}`,
    `L${0.5 * w},${h}`,
    `L${0.4 * w},${0.6 * h}`,
    `L0,${0.5 * h}`,
    `L${0.4 * w},${0.4 * h}`,
    'Z',
  ].join(' ')

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ opacity }}>
      <Path d={path} fill={color} />
    </Svg>
  )
}
