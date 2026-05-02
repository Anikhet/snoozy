import React, { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts } from '@/config/tokens'

interface ChipProps {
  label: string
  isSelected: boolean
  onPress: () => void
}

export const Chip = memo(function Chip({ label, isSelected, onPress }: ChipProps) {
  const { colors } = useThemeColors()

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isSelected ? colors.ink : colors.surface,
            borderColor: isSelected ? colors.ink : colors.hair,
            borderWidth: isSelected ? 0 : 1,
          },
        ]}
      >
        <Text
          style={[
            Fonts.captionSemiBold,
            { color: isSelected ? colors.background : colors.ink },
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
    justifyContent: 'center',
    alignItems: 'center',
  },
})
