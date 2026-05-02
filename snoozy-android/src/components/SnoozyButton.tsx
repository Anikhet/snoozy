import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing, Radii, Sizing, getLiftShadow } from '@/config/tokens'

type ButtonStyle = 'primary' | 'indigo' | 'subtle'

interface SnoozyButtonProps {
  title: string
  icon?: keyof typeof Ionicons.glyphMap
  onPress: () => void
  disabled?: boolean
  buttonStyle?: ButtonStyle
}

export function SnoozyButton({
  title,
  icon,
  onPress,
  disabled,
  buttonStyle = 'primary',
}: SnoozyButtonProps) {
  const { colors, isDark } = useThemeColors()

  const textColor =
    buttonStyle === 'subtle' ? colors.ink : colors.background

  const content = (
    <View style={styles.inner}>
      {icon ? (
        <Ionicons name={icon} size={18} color={textColor} />
      ) : null}
      <Text style={[Fonts.buttonLabel, { color: textColor }]}>
        {title}
      </Text>
    </View>
  )

  const isIndigo = buttonStyle === 'indigo'

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.pressable, disabled ? { opacity: 0.55 } : null]}
    >
      {isIndigo ? (
        <LinearGradient
          colors={['#5B5BD6', '#7272D8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.container, getLiftShadow(isDark)]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.container,
            {
              backgroundColor:
                buttonStyle === 'subtle' ? colors.surface : colors.ink,
            },
            getLiftShadow(isDark),
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'stretch',
  },
  container: {
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
})
