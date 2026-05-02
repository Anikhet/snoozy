import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Fonts, Spacing, ThemeColors } from '@/config/tokens'
import { useStoryStore } from '@/stores/storyStore'
import { SnoozyButton } from '@/components/SnoozyButton'
import { ProgressDots } from '@/components/ProgressDots'

interface WhoForProps {
  colors: ThemeColors
  onNext: () => void
  onBack: () => void
}

const AGES = [3, 4, 5, 6, 7, 8]

export function OnboardingWhoFor({ colors, onNext, onBack }: WhoForProps) {
  const updateChildDetails = useStoryStore((s) => s.updateChildDetails)
  const childDetails = useStoryStore((s) => s.childDetails)

  const isValid = !!childDetails.name.trim()

  return (
    <ScrollView
      style={[styles.fullScreen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar — back button on left, "2 OF 3" centered, balance spacer on right */}
      <View style={styles.topBar}>
        <Pressable
          onPress={onBack}
          style={[styles.backCircle, { backgroundColor: colors.surface, borderColor: colors.hair }]}
        >
          <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '600' }}>{'‹'}</Text>
        </Pressable>
        <View style={styles.topBarFlex} />
        <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>2 OF 3</Text>
        <View style={styles.topBarFlex} />
        <View style={styles.topBarBalance} />
      </View>

      {/* Title block */}
      <View style={styles.titleBlock}>
        <Text style={[Fonts.eyebrow, { color: colors.inkMute }]}>
          FIRST, TELL US {'—'}
        </Text>
        <View style={styles.titleStack}>
          <Text style={[Fonts.serifDisplay, { color: colors.ink, fontSize: 36, lineHeight: 42 }]}>
            Who are we
          </Text>
          <Text style={[Fonts.serifDisplayItalic, { color: colors.primary, fontSize: 36, lineHeight: 42 }]}>
            tucking in tonight?
          </Text>
        </View>
      </View>

      {/* Form section */}
      <View style={styles.formSection}>
        {/* Name card */}
        <View style={[styles.nameCard, { backgroundColor: colors.surface, borderColor: colors.hair }]}>
          <Text style={[Fonts.eyebrow, { color: colors.inkMute, letterSpacing: 1 }]}>THEIR NAME</Text>
          <TextInput
            value={childDetails.name}
            onChangeText={(text) => updateChildDetails({ name: text })}
            placeholder="e.g. Ava"
            placeholderTextColor={colors.inkMute}
            style={[styles.nameInput, { color: colors.ink }]}
            maxLength={50}
          />
        </View>

        {/* Age picker */}
        <View style={styles.ageSection}>
          <Text style={[Fonts.eyebrow, { color: colors.inkMute, letterSpacing: 1, marginLeft: 4 }]}>
            HOW OLD?
          </Text>
          <View style={styles.ageRow}>
            {AGES.map((age) => {
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
                      isSelected
                        ? {
                            shadowColor: colors.ink,
                            shadowOpacity: 0.22,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 8 },
                            elevation: 6,
                          }
                        : null,
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
        </View>

        {/* Reassurance box */}
        <View style={[styles.reassurance, { backgroundColor: colors.primarySoft }]}>
          <Text style={{ fontSize: 14, color: colors.primaryInk }}>{'☾'}</Text>
          <View style={styles.reassuranceCopy}>
            <Text style={[Fonts.caption2Bold, { color: colors.primaryInk }]}>
              We&apos;ll keep this private.
            </Text>
            <Text style={[Fonts.caption2, { color: colors.primaryInk, opacity: 0.85 }]}>
              Names help us make the story personal {'—'} they never leave your phone.
            </Text>
          </View>
        </View>
      </View>

      {/* Spacer pushes the CTA to the bottom on tall screens (mirrors iOS Spacer(minLength: 60)) */}
      <View style={styles.spacer} />

      {/* Bottom CTA */}
      <View style={styles.bottom}>
        <SnoozyButton title="Continue" onPress={onNext} disabled={!isValid} />
        <ProgressDots currentStep={1} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  content: {
    paddingHorizontal: 0,
    paddingTop: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarFlex: {
    flex: 1,
  },
  topBarBalance: {
    width: 36,
    height: 36,
  },
  titleBlock: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 72,
    gap: 10,
  },
  titleStack: {
    gap: 0,
  },
  formSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 48,
    gap: 20,
  },
  nameCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 4,
    shadowColor: '#2B2130',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  nameInput: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay_500Medium_Italic',
    letterSpacing: -0.4,
    padding: 0,
  },
  ageSection: {
    gap: 10,
  },
  ageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ageFlex: { flex: 1 },
  ageButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageText: { fontSize: 18, fontFamily: 'PlayfairDisplay_500Medium' },
  reassurance: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    padding: 14,
  },
  reassuranceCopy: { flex: 1, gap: 2 },
  spacer: {
    flexGrow: 1,
    minHeight: 60,
  },
  bottom: {
    paddingHorizontal: Spacing.xl,
    gap: 22,
    alignItems: 'stretch',
  },
})
