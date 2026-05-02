import React, { useCallback } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing, Radii } from '@/config/tokens'
import { useAuth } from '@clerk/clerk-expo'
import { useStoryStore } from '@/stores/storyStore'
import { Screen } from '@/types/navigation'
import { AppConfig } from '@/config/appConfig'
import { VOICES } from '@/config/voices'
import { SnoozyButton } from '@/components/SnoozyButton'
import { Chip } from '@/components/Chip'
import { ColorDot } from '@/components/ColorDot'

const COLOR_OPTIONS = [
  { name: 'Rose', hex: '#E9A6B3' },
  { name: 'Sky', hex: '#94B9D6' },
  { name: 'Sun', hex: '#E9C77A' },
  { name: 'Moss', hex: '#A7C7A1' },
  { name: 'Plum', hex: '#9B8CC2' },
  { name: 'Peach', hex: '#F0B393' },
]
const ANIMAL_OPTIONS = ['Bunny', 'Bear', 'Fox', 'Owl', 'Deer', 'Cat', 'Dog', 'Elephant']

export function StoryFormScreen() {
  const { colors, isDark } = useThemeColors()
  const template = useStoryStore((s) => s.selectedTemplate)
  const childDetails = useStoryStore((s) => s.childDetails)
  const updateChildDetails = useStoryStore((s) => s.updateChildDetails)
  const navigateTo = useStoryStore((s) => s.navigateTo)
  const generateStoryAction = useStoryStore((s) => s.generateStory)
  const { getToken } = useAuth()

  const isFormValid = useCallback(() => {
    if (!template) return false
    if (!childDetails.name.trim()) return false
    return template.fields.every((field) => {
      switch (field.type) {
        case 'color': return !!childDetails.favoriteColor
        case 'animal': return !!childDetails.favoriteAnimal
        case 'text': return !!childDetails.favoriteThing
        default: return false
      }
    })
  }, [template, childDetails])

  if (!template) return null

  const valid = isFormValid()
  const gradientStart = isDark ? template.gradientStartDark : template.gradientStartLight
  const gradientEnd = isDark ? template.gradientEndDark : template.gradientEndLight

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigateTo(Screen.TemplatePicker)}
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.hair }]}
        >
          <Ionicons name="chevron-back" size={14} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>
          STEP 2 OF 3
        </Text>

        {/* Template chip */}
        <LinearGradient
          colors={[gradientStart, gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.templateChip}
        >
          <Text style={styles.templateGlyph}>{template.glyph}</Text>
          <Text style={[Fonts.caption2Bold, { color: colors.ink }]}>
            {template.name}
          </Text>
        </LinearGradient>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={[Fonts.serifTitle, { color: colors.ink }]}>
            Tell us about
          </Text>
          <Text style={[Fonts.serifTitleItalic, { color: colors.primary }]}>
            the dreamer.
          </Text>
        </View>

        {/* Name field */}
        <View style={styles.fieldGroup}>
          <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>NAME</Text>
          <TextInput
            value={childDetails.name}
            onChangeText={(text) => updateChildDetails({ name: text })}
            placeholder="Their name"
            maxLength={50}
            placeholderTextColor={colors.inkMute}
            style={[
              styles.nameInput,
              { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.hair },
            ]}
          />
        </View>

        {/* Age picker */}
        <View style={styles.fieldGroup}>
          <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>AGE</Text>
          <View style={styles.ageRow}>
            {AppConfig.ageRange.map((age) => {
              const isSelected = childDetails.age === age
              return (
                <Pressable
                  key={age}
                  onPress={() => updateChildDetails({ age })}
                  style={styles.ageFlex}
                >
                  <View
                    style={[
                      styles.ageButton,
                      {
                        backgroundColor: isSelected ? colors.ink : colors.surface,
                        borderColor: isSelected ? colors.ink : colors.hair,
                        borderWidth: isSelected ? 0 : 1,
                      },
                      isSelected ? {
                        shadowColor: colors.ink,
                        shadowOpacity: 0.22,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 4,
                      } : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ageText,
                        { color: isSelected ? colors.background : colors.ink },
                      ]}
                    >
                      {age}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Dynamic fields */}
        {template.fields.map((field) => (
          <View key={field.id} style={styles.fieldGroup}>
            <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>
              {field.label.toUpperCase()}
            </Text>
            {field.type === 'color' ? (
              <View>
                <View style={styles.colorRow}>
                  {COLOR_OPTIONS.map((c) => (
                    <ColorDot
                      key={c.name}
                      color={c.hex}
                      isSelected={childDetails.favoriteColor === c.name}
                      onPress={() => updateChildDetails({ favoriteColor: c.name })}
                    />
                  ))}
                </View>
                {childDetails.favoriteColor ? (
                  <Text style={[styles.colorConfirm, { color: colors.inkSoft }]}>
                    {childDetails.favoriteColor} it is.
                  </Text>
                ) : null}
              </View>
            ) : field.type === 'animal' ? (
              <View style={styles.flowLayout}>
                {ANIMAL_OPTIONS.map((animal) => (
                  <Chip
                    key={animal}
                    label={animal}
                    isSelected={childDetails.favoriteAnimal === animal}
                    onPress={() => updateChildDetails({ favoriteAnimal: animal })}
                  />
                ))}
              </View>
            ) : (
              <TextInput
                value={childDetails.favoriteThing ?? ''}
                onChangeText={(text) => updateChildDetails({ favoriteThing: text })}
                placeholder="e.g. dinosaurs, rainbows, rockets"
                maxLength={50}
                placeholderTextColor={colors.inkMute}
                style={[
                  styles.textInput,
                  { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.hair },
                ]}
              />
            )}
          </View>
        ))}

        {/* Voice grid */}
        <View style={styles.fieldGroup}>
          <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>
            NARRATOR VOICE
          </Text>
          <View style={styles.voiceGrid}>
            {VOICES.map((voice) => {
              const isSelected = childDetails.voiceId === voice.id
              return (
                <Pressable
                  key={voice.id}
                  onPress={() => updateChildDetails({ voiceId: voice.id })}
                  style={styles.voiceFlex}
                >
                  <View
                    style={[
                      styles.voiceCell,
                      {
                        backgroundColor: isSelected ? colors.ink : colors.surface,
                        borderColor: isSelected ? colors.ink : colors.hair,
                        borderWidth: isSelected ? 0 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.voiceName,
                        { color: isSelected ? colors.background : colors.ink },
                      ]}
                    >
                      {voice.displayName}
                    </Text>
                    <Text
                      style={[
                        styles.voiceDesc,
                        { color: isSelected ? colors.background : colors.ink, opacity: isSelected ? 0.75 : 0.75 },
                      ]}
                    >
                      {voice.description}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* Spacer for floating CTA */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating bottom CTA */}
      <View style={styles.floatingCta}>
        <LinearGradient
          colors={[`${colors.background}00`, colors.background]}
          style={styles.fadeGradient}
        />
        <View style={[styles.ctaInner, { backgroundColor: colors.background }]}>
          <View style={{ opacity: valid ? 1 : 0.55 }}>
            <SnoozyButton
              title="Begin the story"
              icon="sparkles"
              buttonStyle="indigo"
              onPress={async () => {
                const token = await getToken()
                if (token) generateStoryAction(token)
              }}
              disabled={!valid}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  templateGlyph: {
    fontSize: 14,
    fontFamily: 'PlayfairDisplay_400Regular',
  },
  titleBlock: {
    gap: 0,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  nameInput: {
    height: 52,
    borderRadius: Radii.field,
    borderWidth: 1,
    paddingHorizontal: 18,
    fontSize: 20,
    fontFamily: 'PlayfairDisplay_500Medium_Italic',
    letterSpacing: -0.4,
  },
  textInput: {
    height: 52,
    borderRadius: Radii.field,
    borderWidth: 1,
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
  },
  ageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ageFlex: {
    flex: 1,
  },
  ageButton: {
    height: 48,
    borderRadius: Radii.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageText: {
    fontSize: 18,
    fontFamily: 'PlayfairDisplay_500Medium',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorConfirm: {
    fontSize: 13,
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    marginTop: 2,
  },
  flowLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  voiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  voiceFlex: {
    width: '48%',
  },
  voiceCell: {
    height: 58,
    borderRadius: 16,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  voiceName: {
    fontSize: 15,
    fontFamily: 'PlayfairDisplay_500Medium',
  },
  voiceDesc: {
    fontSize: 10.5,
    fontFamily: 'Nunito_400Regular',
  },
  floatingCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  fadeGradient: {
    height: 28,
  },
  ctaInner: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 30,
  },
})
