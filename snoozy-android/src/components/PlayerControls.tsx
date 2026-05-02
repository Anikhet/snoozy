import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Triangle } from '@/components/Triangle'
import { ThemeColors } from '@/config/tokens'

/* ─── Play/Pause Button ─── */
interface PlayPauseProps {
  isPlaying: boolean
  isNight: boolean
  onPress: () => void
  colors: ThemeColors
}

export function PlayPauseButton({ isPlaying, isNight, onPress, colors }: PlayPauseProps) {
  const size = isNight ? 80 : 72
  const gradientColors = isNight
    ? ['#F9F2E4', colors.accent] as const
    : [colors.ink, '#3D3142'] as const
  const iconColor = isNight ? colors.night : colors.background
  const shadowColor = isNight ? colors.accent : colors.ink
  const shadowOpacity = isNight ? 0.45 : 0.32

  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={[...gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.playButton,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            shadowColor,
            shadowOpacity,
            shadowRadius: isNight ? 22 : 18,
            shadowOffset: { width: 0, height: 12 },
            elevation: 12,
          },
        ]}
      >
        <View style={styles.specularDot} />
        {isPlaying ? (
          <View style={styles.pauseIcon}>
            <View style={[styles.pauseBar, { backgroundColor: iconColor }]} />
            <View style={[styles.pauseBar, { backgroundColor: iconColor }]} />
          </View>
        ) : (
          <View style={{ marginLeft: 3 }}>
            <Triangle size={18} color={iconColor} />
          </View>
        )}
      </LinearGradient>
    </Pressable>
  )
}

/* ─── Seek Button ─── */
interface SeekProps {
  label: string
  onPress: () => void
  isNight: boolean
  colors: ThemeColors
}

export function SeekButton({ label, onPress, isNight, colors }: SeekProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.seekButton,
        isNight
          ? { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: colors.nightHair, borderWidth: 1 }
          : null,
      ]}
    >
      <Text
        style={[
          styles.seekLabel,
          { color: isNight ? colors.nightInk : colors.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  playButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  specularDot: {
    position: 'absolute',
    top: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 4,
  },
  pauseBar: {
    width: 5,
    height: 22,
    borderRadius: 2.5,
  },
  seekButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
})
