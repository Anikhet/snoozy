import React from 'react'
import { Ionicons } from '@expo/vector-icons'

interface AppIconProps {
  name: string
  size: number
  color: string
}

/**
 * Unified icon component that maps SF Symbol names to the closest Ionicons equivalent.
 * Falls back to the name directly as an Ionicon if no mapping exists.
 */
export function AppIcon({ name, size, color }: AppIconProps) {
  const ionName = SF_TO_IONICON[name] ?? name
  return (
    <Ionicons
      name={ionName as keyof typeof Ionicons.glyphMap}
      size={size}
      color={color}
    />
  )
}

const SF_TO_IONICON: Record<string, string> = {
  'moon.stars.fill': 'moon',
  'book.closed.fill': 'book',
  'hare.fill': 'paw',
  'water.waves': 'water',
  'moonphase.waning.crescent': 'planet',
  'gobackward.15': 'play-back',
  'goforward.15': 'play-forward',
  'moon.zzz.fill': 'moon',
  'moon.zzz': 'moon-outline',
}
