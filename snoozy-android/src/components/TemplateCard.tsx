import React, { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Template } from '@/types/template'
import { Fonts, Spacing } from '@/config/tokens'

interface TemplateCardProps {
  template: Template
  onTap: () => void
}

/**
 * A gradient tile in the template picker. Frosted-glass serif glyph badge
 * on top, editorial name + description below, subtle speckle stars.
 */
export const TemplateCard = memo(function TemplateCard({ template, onTap }: TemplateCardProps) {
  const { colors, isDark } = useThemeColors()
  const gradient = isDark ? template.gradient.dark : template.gradient.light

  return (
    <Pressable onPress={onTap} style={styles.pressable}>
      <View style={[styles.container, { shadowColor: colors.ink }]}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* speckle stars */}
        {SPECKLE.map((p, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: p[0] + (template.id.length % 12),
              top: p[1],
              width: p[2],
              height: p[2],
              borderRadius: p[2] / 2,
              backgroundColor: 'rgba(255,255,255,0.55)',
            }}
          />
        ))}

        <View style={styles.inner}>
          <View style={styles.glyphBadge}>
            <Text style={styles.glyph}>{template.glyph}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text
            style={[Fonts.serifHeadline, { fontSize: 17, color: colors.ink }]}
            numberOfLines={1}
          >
            {template.name}
          </Text>
          <Text style={[styles.desc, { color: colors.inkSoft }]} numberOfLines={2}>
            {template.description}
          </Text>
        </View>
      </View>
    </Pressable>
  )
})

const SPECKLE: [number, number, number][] = [
  [10, 40, 2],
  [28, 60, 1.5],
  [46, 52, 2],
  [64, 76, 1.5],
  [82, 60, 2.2],
  [100, 84, 1.5],
  [118, 50, 1.8],
  [136, 72, 1.5],
]

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  container: {
    flex: 1,
    height: 158,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(43,33,48,0.04)',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  inner: {
    flex: 1,
    padding: 14,
  },
  glyphBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 20,
    color: '#2B2130',
  },
  desc: {
    fontSize: 11,
    fontFamily: 'Nunito_400Regular',
    marginTop: 3,
    lineHeight: 15,
  },
})
