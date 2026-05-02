import React, { memo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useThemeColors } from '@/hooks/useThemeColors'

interface ColorDotProps {
  color: string
  isSelected: boolean
  onPress: () => void
}

/**
 * 38×38 color picker. Tap target stays 38×38 (matches iOS frame) so 6 dots
 * fit on a single row; the 54×54 selection ring renders as a visual overlay
 * outside the layout footprint when selected.
 */
export const ColorDot = memo(function ColorDot({
  color,
  isSelected,
  onPress,
}: ColorDotProps) {
  const { colors } = useThemeColors()

  return (
    <Pressable onPress={onPress} style={styles.touchTarget}>
      {isSelected ? (
        <View style={[styles.selectionRing, { borderColor: `${colors.ink}33` }]} />
      ) : null}
      <View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            borderWidth: isSelected ? 3 : 0,
            borderColor: isSelected ? colors.ink : 'transparent',
          },
        ]}
      >
        <View style={styles.specular} />
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  touchTarget: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionRing: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
  },
  dot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    overflow: 'hidden',
  },
  specular: {
    width: 10,
    height: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
})
