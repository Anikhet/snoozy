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
    if (!childDetails.age) return false
    return true
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
