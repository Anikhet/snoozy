import React from 'react'
import Svg, { Circle, Line } from 'react-native-svg'

interface ConstellationProps {
  color: string
  opacity?: number
}

const NODES = [
  { x: 10, y: 20 },
  { x: 40, y: 35 },
  { x: 70, y: 15 },
  { x: 95, y: 40 },
  { x: 105, y: 65 },
]

/** 5-node constellation with dashed connecting lines. */
export function Constellation({ color, opacity = 1 }: ConstellationProps) {
  return (
    <Svg
      width={120}
      height={80}
      viewBox="0 0 120 80"
      style={{ opacity }}
    >
      {NODES.map((node, i) => {
        if (i === 0) return null
        const prev = NODES[i - 1]
        return (
          <Line
            key={`line-${i}`}
            x1={prev.x}
            y1={prev.y}
            x2={node.x}
            y2={node.y}
            stroke={color}
            strokeWidth={0.8}
            strokeDasharray="1,3"
          />
        )
      })}
      {NODES.map((node, i) => (
        <Circle
          key={`dot-${i}`}
          cx={node.x}
          cy={node.y}
          r={i === 2 ? 2.5 : 1.5}
          fill={color}
        />
      ))}
    </Svg>
  )
}
