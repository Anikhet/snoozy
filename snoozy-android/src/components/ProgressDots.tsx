import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useThemeColors } from '@/hooks/useThemeColors'

interface ProgressDotsProps {
  currentStep: number
  totalSteps?: number
}

/** 3 capsule-shaped progress indicators. */
export function ProgressDots({ currentStep, totalSteps = 3 }: ProgressDotsProps) {
  const { colors } = useThemeColors()

  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const isActive = i === currentStep
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: isActive ? 18 : 6,
                backgroundColor: isActive
                  ? colors.ink
                  : `${colors.ink}2E`, // ~18% opacity
              },
            ]}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 3,
    borderRadius: 1.5,
  },
})
