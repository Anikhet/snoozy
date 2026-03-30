import React, { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { AppIcon } from '@/components/AppIcon'
import { Fonts, Spacing, Radii, Sizing, getCardShadow } from '@/config/tokens'

interface TemplateCardProps {
  name: string
  description: string
  icon: string
  cardColorLight: string
  cardColorDark: string
  onTap: () => void
}

export const TemplateCard = memo(function TemplateCard({
  name,
  description,
  icon,
  cardColorLight,
  cardColorDark,
  onTap,
}: TemplateCardProps) {
  const { colors, isDark } = useThemeColors()
  const cardColor = isDark ? cardColorDark : cardColorLight

  return (
    <Pressable onPress={onTap}>
      <View
        style={[
          styles.container,
          { backgroundColor: cardColor },
          getCardShadow(isDark),
        ]}
      >
        <View style={styles.iconFrame}>
          <AppIcon
            name={icon}
            size={32}
            color={colors.primary}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={[Fonts.headline, { color: colors.textPrimary }]}>
            {name}
          </Text>
          <Text style={[Fonts.caption, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={12}
          color={colors.textSecondary + '80'}
          style={styles.chevron}
        />
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    minHeight: Sizing.cardMinHeight,
    borderRadius: Radii.card,
    gap: Spacing.md,
  },
  iconFrame: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  chevron: {
    fontWeight: '600',
  },
})
