import React, { memo, useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts } from '@/config/tokens'

interface TemplateCardProps {
  name: string
  description: string
  glyph: string
  gradientStart: string
  gradientEnd: string
  templateId: string
  onTap: () => void
}

/** 8 decorative speckle dots positioned deterministically per template. */
function useSpeckles(templateId: string) {
  return useMemo(() => {
    const idLen = templateId.length
    return Array.from({ length: 8 }, (_, i) => ({
      x: 10 + i * 18 + (idLen % 12),
      y: 40 + ((i * 13) % 40),
      r: 1 + (i % 3) * 0.3,
    }))
  }, [templateId])
}

export const TemplateCard = memo(function TemplateCard({
  name,
  description,
  glyph,
  gradientStart,
  gradientEnd,
  templateId,
  onTap,
}: TemplateCardProps) {
  const { colors, isDark } = useThemeColors()
  const speckles = useSpeckles(templateId)

  return (
    <Pressable onPress={onTap} style={styles.pressable}>
      <LinearGradient
        colors={[gradientStart, gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.container,
          {
            borderColor: isDark ? 'rgba(242,237,227,0.04)' : 'rgba(43,33,48,0.04)',
            shadowColor: colors.ink,
          },
        ]}
      >
        {/* Speckle dots */}
        {speckles.map((dot, i) => (
          <View
            key={i}
            style={[
              styles.speckle,
              {
                left: dot.x,
                top: dot.y,
                width: dot.r * 2,
                height: dot.r * 2,
                borderRadius: dot.r,
              },
            ]}
          />
        ))}

        {/* Glyph badge */}
        <View style={styles.glyphBadge}>
          <Text style={[styles.glyphText, { color: colors.ink }]}>
            {glyph}
          </Text>
        </View>

        <View style={styles.spacer} />

        {/* Name + description */}
        <Text
          style={[Fonts.serifBody, { color: colors.ink }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          style={[styles.description, { color: colors.inkSoft }]}
          numberOfLines={2}
        >
          {description}
        </Text>
      </LinearGradient>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  container: {
    height: 158,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: 'hidden',
  },
  speckle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  glyphBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.80)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphText: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_400Regular',
  },
  spacer: {
    flex: 1,
  },
  description: {
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Nunito_400Regular',
    marginTop: 3,
  },
})
