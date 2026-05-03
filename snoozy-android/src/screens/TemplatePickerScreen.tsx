import React, { useCallback } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { TEMPLATES } from '@/config/templates'
import { Template } from '@/types/template'
import { TemplateCard } from '@/components/TemplateCard'

/** Pick a theme — 2-column gradient grid with editorial copy. */
export function TemplatePickerScreen() {
  const { colors } = useThemeColors()
  const selectTemplate = useStoryStore((s) => s.selectTemplate)
  const goHome = useStoryStore((s) => s.goHome)

  const handleSelect = useCallback(
    (template: Template) => selectTemplate(template),
    [selectTemplate],
  )

  // 2-column grid arrangement
  const rows: Template[][] = []
  for (let i = 0; i < TEMPLATES.length; i += 2) {
    rows.push(TEMPLATES.slice(i, i + 2))
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={goHome}
          style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.hair }]}
        >
          <Ionicons name="chevron-back" size={14} color={colors.ink} />
        </Pressable>
        <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>STEP 1 OF 3</Text>
      </View>

      {/* Title */}
      <View style={styles.title}>
        <Text style={[Fonts.serifTitle, { color: colors.ink, fontSize: 34 }]}>
          Pick a place
        </Text>
        <Text
          style={[
            Fonts.serifTitle,
            {
              color: colors.primary,
              fontSize: 34,
              fontFamily: 'Nunito_700Bold',
            },
          ]}
        >
          to wander into.
        </Text>
        <Text style={[Fonts.body, { color: colors.inkSoft, marginTop: 10, fontSize: 13 }]}>
          Each one is a different texture of calm. Choose what fits tonight.
        </Text>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {rows.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onTap={() => handleSelect(t)}
              />
            ))}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </View>

      <Text
        style={[
          Fonts.serifBody,
          {
            color: colors.inkMute,
            textAlign: 'center',
            marginTop: 16,
            fontSize: 12,
            fontFamily: 'Nunito_400Regular',
          },
        ]}
      >
        Tap one to begin
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 8,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 22,
  },
  grid: {
    marginTop: 22,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
})
