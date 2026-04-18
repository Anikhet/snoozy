import React, { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing } from '@/config/tokens'

interface ChipProps {
  label: string
  isSelected: boolean
  onPress: () => void
}

/**
 * A pill chip used in the story form. Ink pill when selected,
 * surface with hairline border when not.
 */
export const Chip = memo(function Chip({ label, isSelected, onPress }: ChipProps) {
  const { colors } = useThemeColors()

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isSelected ? colors.ink : colors.surface,
            borderColor: isSelected ? 'transparent' : colors.hair,
          },
        ]}
      >
        <Text
          style={[
            Fonts.caption,
            {
              color: isSelected ? colors.background : colors.ink,
              fontSize: 13,
              fontFamily: 'Nunito_700Bold',
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
})
