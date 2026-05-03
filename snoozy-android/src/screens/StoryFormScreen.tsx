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
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '@clerk/clerk-expo'
import { useThemeColors } from '@/hooks/useThemeColors'
import { Fonts, Spacing } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { Screen } from '@/types/navigation'
import { AppConfig } from '@/config/appConfig'
import { VOICES } from '@/config/voices'
import { SnoozyButton } from '@/components/SnoozyButton'

const COLOR_OPTIONS: { name: string; hex: string }[] = [
  { name: 'Rose', hex: '#E9A6B3' },
  { name: 'Sky', hex: '#94B9D6' },
  { name: 'Sun', hex: '#E9C77A' },
  { name: 'Moss', hex: '#A7C7A1' },
  { name: 'Plum', hex: '#9B8CC2' },
  { name: 'Peach', hex: '#F0B393' },
]

const ANIMAL_OPTIONS = ['Bunny', 'Bear', 'Fox', 'Owl', 'Deer', 'Cat', 'Dog', 'Elephant']

/** Editorial prompt, large italic name field, ink-pill age chips,
 *  pastel color dots, two-column voice grid, indigo gradient CTA. */
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => navigateTo(Screen.TemplatePicker)}
              style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.hair }]}
            >
              <Ionicons name="chevron-back" size={14} color={colors.ink} />
            </Pressable>
            <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>STEP 2 OF 3</Text>
          </View>

          {/* Template chip */}
          <View style={styles.chipRow}>
            <LinearGradient
              colors={(isDark ? template.gradient.dark : template.gradient.light) as readonly [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.templateChip}
            >
              <Text style={[styles.templateChipGlyph, { color: colors.ink }]}>
                {template.glyph}
              </Text>
              <Text style={[Fonts.caption, { color: colors.ink, fontSize: 12 }]}>
                {template.name}
              </Text>
            </LinearGradient>
          </View>

          {/* Title */}
          <View style={styles.title}>
            <Text style={[Fonts.serifTitle, { color: colors.ink }]}>
              Tell us about
            </Text>
            <Text
              style={[
                Fonts.serifTitle,
                {
                  color: colors.primary,
                  fontFamily: 'Fraunces_400Regular_Italic',
                },
              ]}
            >
              the dreamer.
            </Text>
          </View>

          {/* Name field */}
          <View style={styles.field}>
            <Text style={[styles.eyebrow, { color: colors.inkMute }]}>THEIR NAME</Text>
            <View
              style={[
                styles.nameField,
                { backgroundColor: colors.surface, borderColor: colors.hair },
              ]}
            >
              <TextInput
                value={childDetails.name}
                onChangeText={(text) => updateChildDetails({ name: text })}
                placeholder="e.g. Ava"
                placeholderTextColor={colors.inkMute}
                maxLength={50}
                style={[
                  styles.nameInput,
                  { color: colors.ink, fontFamily: 'Fraunces_500Medium_Italic' },
                ]}
              />
            </View>
          </View>

          {/* Age */}
          <View style={styles.field}>
            <Text style={[styles.eyebrow, { color: colors.inkMute, paddingLeft: 4 }]}>
              THEIR AGE
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {AppConfig.ageRange.map((age) => {
                const selected = childDetails.age === age
                return (
                  <Pressable key={age} onPress={() => updateChildDetails({ age })}>
                    <View
                      style={[
                        styles.ageBtn,
                        {
                          backgroundColor: selected ? colors.ink : colors.surface,
                          borderColor: selected ? 'transparent' : colors.hair,
                          shadowColor: colors.ink,
                          shadowOpacity: selected ? 0.22 : 0,
                          shadowRadius: 6,
                          shadowOffset: { width: 0, height: 6 },
                          elevation: selected ? 4 : 0,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: selected ? colors.background : colors.ink,
                          fontFamily: 'Fraunces_500Medium',
                          fontSize: 18,
                        }}
                      >
                        {age}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>

          {/* Template-specific fields */}
          {template.fields.map((field) => (
            <View key={field.id} style={styles.field}>
              <Text style={[styles.eyebrow, { color: colors.inkMute }]}>
                {field.label.toUpperCase()}
              </Text>
              {field.type === 'color' ? (
                <ColorDots
                  selected={childDetails.favoriteColor}
                  onSelect={(name) => updateChildDetails({ favoriteColor: name })}
                  colors={colors}
                />
              ) : field.type === 'animal' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {ANIMAL_OPTIONS.map((a) => {
                    const selected = childDetails.favoriteAnimal === a
                    return (
                      <Pressable
                        key={a}
                        onPress={() => updateChildDetails({ favoriteAnimal: a })}
                      >
                        <View
                          style={[
                            styles.animalChip,
                            {
                              backgroundColor: selected ? colors.ink : colors.surface,
                              borderColor: selected ? 'transparent' : colors.hair,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: selected ? colors.background : colors.ink,
                              fontFamily: 'Nunito_700Bold',
                              fontSize: 13,
                            }}
                          >
                            {a}
                          </Text>
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              ) : (
                <View
                  style={[
                    styles.nameField,
                    { backgroundColor: colors.surface, borderColor: colors.hair },
                  ]}
                >
                  <TextInput
                    value={childDetails.favoriteThing ?? ''}
                    onChangeText={(text) => updateChildDetails({ favoriteThing: text })}
                    placeholder="e.g. dinosaurs, rainbows, rockets"
                    placeholderTextColor={colors.inkMute}
                    maxLength={50}
                    style={[
                      { color: colors.ink, fontFamily: 'Nunito_400Regular', fontSize: 16 },
                    ]}
                  />
                </View>
              )}
            </View>
          ))}

          {/* Voice grid */}
          <View style={styles.field}>
            <Text style={[styles.eyebrow, { color: colors.inkMute }]}>NARRATOR</Text>
            <View style={styles.voiceGrid}>
              {VOICES.map((v) => {
                const selected = childDetails.voiceId === v.id
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => updateChildDetails({ voiceId: v.id })}
                    style={{ width: '48.5%' }}
                  >
                    <View
                      style={[
                        styles.voiceCard,
                        {
                          backgroundColor: selected ? colors.ink : colors.surface,
                          borderColor: selected ? 'transparent' : colors.hair,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: selected ? colors.background : colors.ink,
                          fontFamily: 'Fraunces_500Medium',
                          fontSize: 15,
                        }}
                      >
                        {v.displayName}
                      </Text>
                      <Text
                        style={{
                          color: selected ? colors.background : colors.ink,
                          fontFamily: 'Nunito_400Regular',
                          fontSize: 10.5,
                          opacity: 0.75,
                        }}
                      >
                        {v.description}
                      </Text>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky bottom CTA */}
      <View pointerEvents="box-none" style={styles.ctaWrap}>
        <LinearGradient
          colors={[colors.background + '00', colors.background]}
          style={styles.ctaFade}
        />
        <View style={[styles.ctaInner, { backgroundColor: colors.background }]}>
          <View style={{ opacity: valid ? 1 : 0.55 }} shouldRasterizeIOS renderToHardwareTextureAndroid>
            <SnoozyButton
              title="Begin the story"
              icon="sparkles"
              style="indigo"
              disabled={!valid}
              onPress={async () => {
                const token = await getToken()
                if (token) generateStoryAction(token)
              }}
            />
          </View>
        </View>
      </View>
    </View>
  )
}

function ColorDots({
  selected,
  onSelect,
  colors,
}: {
  selected?: string
  onSelect: (name: string) => void
  colors: ReturnType<typeof useThemeColors>['colors']
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 10 }}>
        {COLOR_OPTIONS.map((c) => {
          const isSelected = selected === c.name
          return (
            <Pressable key={c.name} onPress={() => onSelect(c.name)}>
              <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                {isSelected ? (
                  <View
                    style={{
                      position: 'absolute',
                      width: 54,
                      height: 54,
                      borderRadius: 27,
                      borderWidth: 1,
                      borderColor: colors.ink + '33',
                    }}
                  />
                ) : null}
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: c.hex,
                    borderWidth: isSelected ? 3 : 0,
                    borderColor: colors.ink,
                  }}
                />
              </View>
            </Pressable>
          )
        })}
      </View>
      {selected ? (
        <Text
          style={{
            color: colors.inkSoft,
            fontFamily: 'Fraunces_400Regular_Italic',
            fontSize: 13,
            marginTop: 8,
          }}
        >
          {selected} it is.
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: {
    paddingTop: 8,
    gap: 22,
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
  chipRow: {
    flexDirection: 'row',
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  templateChipGlyph: {
    fontFamily: 'Fraunces_400Regular',
    fontSize: 14,
  },
  title: {
    gap: 0,
  },
  field: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 1,
  },
  nameField: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  nameInput: {
    fontSize: 20,
  },
  ageBtn: {
    width: 40,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  voiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  voiceCard: {
    height: 58,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    gap: 2,
  },
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  ctaFade: {
    height: 28,
  },
  ctaInner: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 30,
  },
})
