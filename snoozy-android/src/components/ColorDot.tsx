import React, { memo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useThemeColors } from '@/hooks/useThemeColors'

interface ColorDotProps {
  color: string
  isSelected: boolean
  onPress: () => void
}

/** 38×38 color picker dot with 54×54 selection ring. */
export const ColorDot = memo(function ColorDot({
  color,
  isSelected,
  onPress,
}: ColorDotProps) {
  const { colors } = useThemeColors()

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.ring,
          isSelected
            ? { borderColor: `${colors.ink}33`, borderWidth: 1 }
            : null,
        ]}
      >
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
          {/* Specular highlight */}
          <View style={styles.specular} />
        </View>
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  ring: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
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
