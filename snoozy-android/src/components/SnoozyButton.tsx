import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Radii, Sizing, Spacing } from '@/config/tokens'

export type SnoozyButtonStyle = 'primary' | 'indigo' | 'subtle'

interface SnoozyButtonProps {
  title: string
  icon?: keyof typeof Ionicons.glyphMap
  onPress: () => void
  disabled?: boolean
  style?: SnoozyButtonStyle
}

/**
 * Snoozy's primary CTA. Ink pill by default, indigo gradient for the
 * "begin the story" moment, subtle surface for secondary actions.
 */
export function SnoozyButton({
  title,
  icon,
  onPress,
  disabled,
  style = 'primary',
}: SnoozyButtonProps) {
  const { colors } = useThemeColors()

  const foreground = style === 'subtle' ? colors.ink : colors.background
  const content = (
    <>
      {icon ? (
        <Ionicons name={icon} size={18} color={foreground} />
      ) : null}
      <Text style={[Fonts.buttonLabel, { color: foreground }]}>{title}</Text>
    </>
  )

  if (style === 'indigo') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        android_ripple={{ color: 'transparent' }}
        shouldRasterizeIOS
        renderToHardwareTextureAndroid
        style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.82 : 1 }]}
      >
        <LinearGradient
          colors={[colors.primary, '#7272D8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          {content}
        </LinearGradient>
      </Pressable>
    )
  }

  const bg =
    style === 'subtle'
      ? colors.surface
      : colors.ink
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: 'transparent' }}
      shouldRasterizeIOS
      renderToHardwareTextureAndroid
      style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.82 : 1 }]}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: bg },
          style === 'subtle' ? { borderWidth: 1, borderColor: colors.hair } : null,
        ]}
      >
        {content}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressable: { alignSelf: 'stretch', borderRadius: Radii.button },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Sizing.buttonHeight,
    borderRadius: Radii.button,
    width: '100%',
    gap: Spacing.sm,
  },
})
