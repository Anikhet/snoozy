import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Fonts, Spacing, Radii, ThemeColors } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { AppConfig } from '@/config/appConfig'
import { SnoozyButton } from '@/components/SnoozyButton'
import { ProgressDots } from '@/components/ProgressDots'

interface WhoForProps {
  colors: ThemeColors
  onNext: () => void
  onBack: () => void
}

export function OnboardingWhoFor({ colors, onNext, onBack }: WhoForProps) {
  const updateChildDetails = useStoryStore((s) => s.updateChildDetails)
  const childDetails = useStoryStore((s) => s.childDetails)

  return (
    <ScrollView
      style={[styles.fullScreen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={[styles.backCircle, { backgroundColor: colors.surface, borderColor: colors.hair }]}
        >
          <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '600' }}>{'\u2039'}</Text>
        </Pressable>
        <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>2 OF 3</Text>
      </View>

      {/* Title */}
      <Text style={[Fonts.serifDisplay, { color: colors.ink, fontSize: 36 }]}>
        Who are we
      </Text>
      <Text style={[Fonts.serifDisplayItalic, { color: colors.primary, fontSize: 36 }]}>
        tucking in tonight?
      </Text>

      {/* Name card */}
      <View style={[styles.nameCard, { backgroundColor: colors.surface, borderColor: colors.hair }]}>
        <Text style={[Fonts.eyebrow, { color: colors.inkMute, letterSpacing: 1 }]}>THEIR NAME</Text>
        <TextInput
          value={childDetails.name}
          onChangeText={(text) => updateChildDetails({ name: text })}
          placeholder="Little one"
          placeholderTextColor={colors.inkMute}
          style={[styles.nameInput, { color: colors.ink }]}
          maxLength={50}
        />
      </View>

      {/* Age picker */}
      <Text style={[Fonts.eyebrow, { color: colors.inkMute, marginTop: Spacing.lg }]}>AGE</Text>
      <View style={styles.ageRow}>
        {AppConfig.ageRange.map((age) => {
          const isSelected = childDetails.age === age
          return (
            <Pressable key={age} onPress={() => updateChildDetails({ age })} style={styles.ageFlex}>
              <View
                style={[
                  styles.ageButton,
                  {
                    backgroundColor: isSelected ? colors.ink : colors.surface,
                    borderColor: isSelected ? colors.ink : colors.hair,
                    borderWidth: isSelected ? 0 : 1,
                  },
                ]}
              >
                <Text style={[styles.ageText, { color: isSelected ? colors.background : colors.ink }]}>
                  {age}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {/* Reassurance box */}
      <View style={[styles.reassurance, { backgroundColor: colors.primarySoft }]}>
        <Text style={{ fontSize: 14 }}>{'\u263E'}</Text>
        <View style={styles.reassuranceCopy}>
          <Text style={[Fonts.caption2Bold, { color: colors.primaryInk }]}>
            We&apos;ll keep this private.
          </Text>
          <Text style={[Fonts.caption2, { color: colors.primaryInk, opacity: 0.85 }]}>
            Names help us make the story personal {'\u2014'} they never leave your phone.
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <SnoozyButton title="Continue" onPress={onNext} disabled={!childDetails.name.trim()} />
        <ProgressDots currentStep={1} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  content: { padding: Spacing.xl, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg,
  },
  backCircle: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  nameCard: {
    borderRadius: Radii.card, borderWidth: 1,
    paddingHorizontal: 22, paddingVertical: 18, gap: Spacing.sm, marginTop: Spacing.lg,
    shadowColor: '#2B2130', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 }, elevation: 4,
  },
  nameInput: {
    fontSize: 28, fontFamily: 'PlayfairDisplay_500Medium_Italic', letterSpacing: -0.4, padding: 0,
  },
  ageRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
  ageFlex: { flex: 1 },
  ageButton: {
    height: 48, borderRadius: Radii.field, alignItems: 'center', justifyContent: 'center',
  },
  ageText: { fontSize: 18, fontFamily: 'PlayfairDisplay_500Medium' },
  reassurance: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: Radii.field, padding: 14, marginTop: Spacing.lg,
  },
  reassuranceCopy: { flex: 1, gap: 2 },
  bottom: { gap: Spacing.lg, marginTop: Spacing.xl, alignItems: 'center' },
})
