import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing, Radii, Sizing, getCardShadow } from '@/config/tokens'

interface SnoozyButtonProps {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  onPress: () => void
  disabled?: boolean
}

export function SnoozyButton({ title, icon, onPress, disabled }: SnoozyButtonProps) {
  const { colors, isDark } = useThemeColors()

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <View
        style={[
          styles.container,
          { backgroundColor: colors.primary },
          getCardShadow(isDark),
        ]}
      >
        <Ionicons name={icon} size={17} color="#FFFFFF" style={styles.icon} />
        <Text style={[Fonts.buttonLabel, styles.text]}>
          {title}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    width: '100%',
    gap: Spacing.sm,
  },
  icon: {
    fontWeight: '600',
  },
  text: {
    color: '#FFFFFF',
  },
})
