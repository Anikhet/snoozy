import React, { useCallback } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { TEMPLATES } from '@/config/templates'
import { Template } from '@/types/template'
import { TemplateCard } from '@/components/TemplateCard'

export function TemplatePickerScreen() {
  const { colors } = useThemeColors()
  const selectTemplate = useStoryStore((s) => s.selectTemplate)
  const goHome = useStoryStore((s) => s.goHome)

  const handleSelect = useCallback(
    (template: Template) => selectTemplate(template),
    [selectTemplate]
  )

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={goHome}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }} />
      </View>

      <Text style={[Fonts.title, { color: colors.textPrimary }]}>
        Pick a story theme
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            name={template.name}
            description={template.description}
            icon={template.icon}
            cardColorLight={template.cardColorLight}
            cardColorDark={template.cardColorDark}
            onTap={() => handleSelect(template)}
          />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
})
