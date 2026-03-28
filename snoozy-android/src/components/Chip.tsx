import React, { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing, Radii, getCardShadow } from '@/config/tokens'

interface ChipProps {
  label: string
  isSelected: boolean
  onPress: () => void
}

export const Chip = memo(function Chip({ label, isSelected, onPress }: ChipProps) {
  const { colors, isDark } = useThemeColors()

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isSelected ? colors.primary : colors.surface,
          },
          getCardShadow(isDark),
        ]}
      >
        <Text
          style={[
            Fonts.caption,
            { color: isSelected ? '#FFFFFF' : colors.textPrimary },
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.small,
  },
})
