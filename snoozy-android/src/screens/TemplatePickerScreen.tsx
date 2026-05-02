import React, { useCallback } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { TEMPLATES } from '@/config/templates'
import { Template } from '@/types/template'
import { TemplateCard } from '@/components/TemplateCard'

export function TemplatePickerScreen() {
  const { colors, isDark } = useThemeColors()
  const selectTemplate = useStoryStore((s) => s.selectTemplate)
  const goHome = useStoryStore((s) => s.goHome)

  const handleSelect = useCallback(
    (template: Template) => selectTemplate(template),
    [selectTemplate]
  )

  const renderItem = useCallback(
    ({ item }: { item: Template }) => {
      const gradientStart = isDark ? item.gradientStartDark : item.gradientStartLight
      const gradientEnd = isDark ? item.gradientEndDark : item.gradientEndLight
      return (
        <TemplateCard
          name={item.name}
          description={item.description}
          glyph={item.glyph}
          gradientStart={gradientStart}
          gradientEnd={gradientEnd}
          templateId={item.id}
          onTap={() => handleSelect(item)}
        />
      )
    },
    [handleSelect, isDark]
  )

  const keyExtractor = useCallback((item: Template) => item.id, [])

  return (
    <View style={styles.root}>
      {/* Header */}
      <Pressable
        onPress={goHome}
        style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.hair }]}
      >
        <Ionicons name="chevron-back" size={14} color={colors.ink} />
      </Pressable>

      {/* Title block */}
      <View style={styles.titleBlock}>
        <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>
          STEP 1 OF 3
        </Text>
        <Text style={[Fonts.serifDisplay, { color: colors.ink, fontSize: 34, letterSpacing: -0.6 }]}>
          Pick a place
        </Text>
        <Text style={[Fonts.serifDisplayItalic, { color: colors.primary, fontSize: 34, letterSpacing: -0.6 }]}>
          to wander into.
        </Text>
        <Text style={[Fonts.caption, { color: colors.inkSoft, maxWidth: 280, marginTop: 4 }]}>
          Each theme changes the prompts while keeping the story quiet and sleep-ready.
        </Text>
      </View>

      {/* 2-column grid */}
      <FlatList
        data={TEMPLATES}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.gridContent}
        ListFooterComponent={
          <Text style={[styles.footerText, { color: colors.inkMute }]}>
            Tap one to begin
          </Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    gap: 2,
    marginBottom: Spacing.sm,
  },
  columnWrapper: {
    gap: 12,
  },
  gridContent: {
    gap: 12,
    paddingBottom: Spacing.xl,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    textAlign: 'center',
    paddingTop: 16,
  },
})
