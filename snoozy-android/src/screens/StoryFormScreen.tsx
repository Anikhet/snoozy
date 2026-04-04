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
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing, Radii, getCardShadow } from '@/config/tokens'
import { useAuth } from '@clerk/clerk-expo'
import { useStoryStore } from '@/stores/storyStore'
import { Screen } from '@/types/navigation'
import { AppConfig } from '@/config/appConfig'
import { VOICES } from '@/config/voices'
import { SnoozyButton } from '@/components/SnoozyButton'
import { Chip } from '@/components/Chip'
import { AppIcon } from '@/components/AppIcon'

const COLOR_OPTIONS = ['Red', 'Blue', 'Purple', 'Pink', 'Green', 'Yellow', 'Orange']
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
        case 'color':
          return !!childDetails.favoriteColor
        case 'animal':
          return !!childDetails.favoriteAnimal
        case 'text':
          return !!childDetails.favoriteThing
        default:
          return false
      }
    })
  }, [template, childDetails])

  if (!template) return null

  const valid = isFormValid()

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => navigateTo(Screen.TemplatePicker)}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Template Badge */}
        <View style={styles.templateBadge}>
          <AppIcon
            name={template.icon}
            size={22}
            color={colors.textPrimary}
          />
          <Text style={[Fonts.title, { color: colors.textPrimary }]}>
            {template.name}
          </Text>
        </View>

        {/* Name Field */}
        <FieldSection label="Child's Name" colors={colors}>
          <TextInput
            value={childDetails.name}
            onChangeText={(text) => updateChildDetails({ name: text })}
            placeholder="Enter name"
            maxLength={50}
            placeholderTextColor={colors.textSecondary}
            style={[
              Fonts.body,
              styles.textInput,
              {
                color: colors.textPrimary,
                backgroundColor: colors.surface,
              },
              getCardShadow(isDark),
            ]}
          />
        </FieldSection>

        {/* Age Picker */}
        <FieldSection label="Age" colors={colors}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {AppConfig.ageRange.map((age) => {
              const isSelected = childDetails.age === age
              return (
                <Pressable
                  key={age}
                  onPress={() => updateChildDetails({ age })}
                >
                  <View
                    style={[
                      styles.ageButton,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.surface,
                      },
                      getCardShadow(isDark),
                    ]}
                  >
                    <Text
                      style={[
                        Fonts.headline,
                        {
                          color: isSelected ? '#FFFFFF' : colors.textPrimary,
                        },
                      ]}
                    >
                      {age}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>
        </FieldSection>

        {/* Template-Specific Fields */}
        {template.fields.map((field) => (
          <FieldSection key={field.id} label={field.label} colors={colors}>
            {field.type === 'color' ? (
              <View style={styles.flowLayout}>
                {COLOR_OPTIONS.map((color) => (
                  <Chip
                    key={color}
                    label={color}
                    isSelected={childDetails.favoriteColor === color}
                    onPress={() => updateChildDetails({ favoriteColor: color })}
                  />
                ))}
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
                onChangeText={(text) =>
                  updateChildDetails({ favoriteThing: text })
                }
                placeholder="e.g. dinosaurs, rainbows, rockets"
                maxLength={50}
                placeholderTextColor={colors.textSecondary}
                style={[
                  Fonts.body,
                  styles.textInput,
                  {
                    color: colors.textPrimary,
                    backgroundColor: colors.surface,
                  },
                  getCardShadow(isDark),
                ]}
              />
            )}
          </FieldSection>
        ))}

        {/* Voice Picker */}
        <FieldSection label="Narrator Voice" colors={colors}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {VOICES.map((voice) => {
              const isSelected = childDetails.voiceId === voice.id
              return (
                <Pressable
                  key={voice.id}
                  onPress={() => updateChildDetails({ voiceId: voice.id })}
                >
                  <View
                    style={[
                      styles.voiceButton,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.surface,
                      },
                      getCardShadow(isDark),
                    ]}
                  >
                    <Text
                      style={[
                        Fonts.headline,
                        {
                          color: isSelected ? '#FFFFFF' : colors.textPrimary,
                        },
                      ]}
                    >
                      {voice.displayName}
                    </Text>
                    <Text
                      style={[
                        Fonts.caption2,
                        {
                          color: isSelected ? '#FFFFFF' : colors.textPrimary,
                        },
                      ]}
                    >
                      {voice.description}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </ScrollView>
        </FieldSection>

        {/* Generate Button */}
        <View style={{ opacity: valid ? 1 : 0.5 }}>
          <SnoozyButton
            title="Story Time!"
            icon="sparkles"
            onPress={async () => {
              const token = await getToken()
              if (token) {
                generateStoryAction(token)
              }
            }}
            disabled={!valid}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function FieldSection({
  label,
  colors,
  children,
}: {
  label: string
  colors: ReturnType<typeof useThemeColors>['colors']
  children: React.ReactNode
}) {
  return (
    <View style={styles.fieldSection}>
      <Text style={[Fonts.caption, { color: colors.textSecondary }]}>
        {label}
      </Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  scrollContent: {
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  templateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fieldSection: {
    gap: Spacing.xs,
  },
  textInput: {
    padding: Spacing.md,
    borderRadius: Radii.small,
  },
  chipRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  flowLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  ageButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.small,
    alignItems: 'center',
    gap: Spacing.xs,
  },
})
