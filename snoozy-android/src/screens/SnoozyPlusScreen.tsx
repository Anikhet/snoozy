import React, { useState, useCallback, useRef } from 'react'
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useAuth } from '@clerk/clerk-expo'
import { useStoryStore } from '@/stores/storyStore'
import { useBackHandler } from '@/hooks/useBackHandler'
import { BackSwipeZone } from '@/components/BackSwipeZone'
import { Fonts, Radii, Spacing } from '@/config/tokens'
import {
  SUBSCRIPTION_PLANS,
  PLUS_FEATURES,
  PlanConfig,
} from '@/config/subscriptionConfig'
import {
  initiateStripePayment,
  initiateRazorpayPayment,
} from '@/services/paymentService'
import { isActive, formatExpiry, daysRemaining } from '@/services/subscriptionService'
import type { SubscriptionPlan } from '@/types/subscription'

const { width: SW } = Dimensions.get('window')

// ─── Palette (dark premium) ───────────────────────────────────────────────────
const P = {
  bg: '#0E0527',
  bgDeep: '#060115',
  surface: 'rgba(255,255,255,0.07)',
  surfaceBorder: 'rgba(255,255,255,0.12)',
  gold: '#F5C518',
  goldSoft: '#FFE082',
  ink: '#F2EDE3',
  inkSoft: 'rgba(242,237,227,0.70)',
  inkMute: 'rgba(242,237,227,0.42)',
  primary: '#7C6AF8',
  primaryDeep: '#5B5BD6',
  razorBlue: '#3395FF',
  success: '#4CAF7D',
  divider: 'rgba(255,255,255,0.10)',
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StarField() {
  const stars = [
    { top: 8, left: 18, size: 4, opacity: 0.55 },
    { top: 22, left: SW * 0.4, size: 3, opacity: 0.45 },
    { top: 12, left: SW * 0.75, size: 5, opacity: 0.6 },
    { top: 38, left: SW * 0.15, size: 2.5, opacity: 0.35 },
    { top: 50, left: SW * 0.6, size: 3.5, opacity: 0.5 },
    { top: 70, left: SW * 0.88, size: 2, opacity: 0.3 },
    { top: 95, left: SW * 0.3, size: 4, opacity: 0.4 },
    { top: 110, left: SW * 0.52, size: 2.5, opacity: 0.35 },
  ]

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: P.goldSoft,
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  )
}

function FeatureRow({ item, index }: { item: (typeof PLUS_FEATURES)[0]; index: number }) {
  return (
    <Animated.View
      entering={FadeInLeft.delay(index * 60).duration(380)}
      style={styles.featureRow}
    >
      <View style={styles.featureIconWrap}>
        <Ionicons name={item.icon} size={20} color={P.gold} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={18} color={P.success} />
    </Animated.View>
  )
}

function PlanCard({
  plan,
  selected,
  onPress,
}: {
  plan: PlanConfig
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.planCard,
        selected && styles.planCardSelected,
        { opacity: pressed ? 0.85 : 1 },
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {/* Selection indicator */}
      <View style={[styles.planRadio, selected && styles.planRadioSelected]}>
        {selected && <View style={styles.planRadioDot} />}
      </View>

      <View style={styles.planInfo}>
        <View style={styles.planLabelRow}>
          <Text style={[styles.planLabel, selected && styles.planLabelSelected]}>
            {plan.label}
          </Text>
          {plan.savingsPercent ? (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Save {plan.savingsPercent}%</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.planPerMonth, selected && styles.planPerMonthSelected]}>
          {plan.perMonthInr}
        </Text>
      </View>

      <View style={styles.planPriceCol}>
        <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>
          {plan.displayInr}
        </Text>
        <Text style={[styles.planPricePeriod, selected && styles.planPricePeriodSelected]}>
          /{plan.id === 'monthly' ? 'mo' : 'yr'}
        </Text>
      </View>
    </Pressable>
  )
}

// ─── Active Subscription View ────────────────────────────────────────────────

function ActiveView({
  onManage,
  onClose,
}: {
  onManage: () => void
  onClose: () => void
}) {
  const subscription = useStoryStore((s) => s.subscription)
  const expiry = subscription.expiresAt ? formatExpiry(subscription.expiresAt) : null
  const days = subscription.expiresAt ? daysRemaining(subscription.expiresAt) : null
  const planLabel = subscription.plan === 'annual' ? 'Annual' : 'Monthly'

  return (
    <ScrollView
      contentContainerStyle={styles.activeContainer}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(500)} style={styles.activeHero}>
        <View style={styles.activeIconWrap}>
          <Ionicons name="star" size={36} color={P.gold} />
        </View>
        <Text style={styles.activeTitle}>Snoozy Plus</Text>
        <View style={styles.activeBadgeRow}>
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
          <Text style={styles.activePlanText}>{planLabel} plan</Text>
        </View>
      </Animated.View>

      {expiry ? (
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.expiryCard}>
          <Ionicons name="calendar-outline" size={18} color={P.goldSoft} style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.expiryLabel}>Renews on</Text>
            <Text style={styles.expiryDate}>{expiry}</Text>
          </View>
          {days !== null && days <= 14 ? (
            <View style={styles.expiryWarning}>
              <Text style={styles.expiryWarningText}>{days}d left</Text>
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(180).duration(400)}>
        <Text style={styles.activeSectionTitle}>Everything included</Text>
      </Animated.View>

      {PLUS_FEATURES.map((f, i) => (
        <FeatureRow key={f.title} item={f} index={i} />
      ))}

      <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.activeFooter}>
        <Pressable
          onPress={onManage}
          style={({ pressed }) => [styles.manageButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.manageButtonText}>Manage subscription</Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.closeTextButton, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={styles.closeTextButtonText}>Close</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  )
}

// ─── Paywall View ─────────────────────────────────────────────────────────────

function PaywallView({ onClose }: { onClose: () => void }) {
  const { getToken } = useAuth()
  const activateSubscription = useStoryStore((s) => s.activateSubscription)
  const childDetails = useStoryStore((s) => s.childDetails)

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('annual')
  const [loading, setLoading] = useState<'stripe' | 'razorpay' | null>(null)

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan)!

  // Scale animation on plan switch
  const scale = useSharedValue(1)
  const priceAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const handlePlanSelect = useCallback((planId: SubscriptionPlan) => {
    setSelectedPlan(planId)
    scale.value = withSpring(0.94, { duration: 120 }, () => {
      scale.value = withSpring(1, { duration: 200 })
    })
  }, [scale])

  const handlePayment = useCallback(
    async (provider: 'stripe' | 'razorpay') => {
      if (loading) return
      setLoading(provider)
      try {
        const outcome =
          provider === 'stripe'
            ? await initiateStripePayment({
                plan: selectedPlan,
                userEmail: 'user@example.com',
                getToken: () => getToken(),
              })
            : await initiateRazorpayPayment({
                plan: selectedPlan,
                userEmail: 'user@example.com',
                userName: childDetails.name || 'Snoozy User',
                getToken: () => getToken(),
              })

        if (!outcome.success) {
          if (!outcome.cancelled) {
            Alert.alert('Payment failed', outcome.message || 'Something went wrong. Please try again.')
          }
          return
        }

        await activateSubscription({
          plan: selectedPlan,
          provider,
          transactionId: outcome.transactionId,
        })

        // Brief success animation before closing
        await new Promise((r) => setTimeout(r, 300))
        onClose()
      } finally {
        setLoading(null)
      }
    },
    [loading, selectedPlan, getToken, childDetails.name, activateSubscription, onClose],
  )

  return (
    <ScrollView
      contentContainerStyle={styles.paywallContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.hero}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="star" size={32} color={P.gold} />
        </View>
        <Text style={styles.heroTitle}>Snoozy Plus</Text>
        <Text style={styles.heroTagline}>
          Magical stories,{'\n'}unlimited dreams ✨
        </Text>
      </Animated.View>

      {/* Features */}
      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.featuresDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerlabel}>Everything you get</Text>
        <View style={styles.dividerLine} />
      </Animated.View>

      {PLUS_FEATURES.map((f, i) => (
        <FeatureRow key={f.title} item={f} index={i} />
      ))}

      {/* Plan selector */}
      <Animated.View entering={FadeInDown.delay(440).duration(400)}>
        <Text style={styles.choosePlanTitle}>Choose your plan</Text>
        {SUBSCRIPTION_PLANS.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            selected={selectedPlan === p.id}
            onPress={() => handlePlanSelect(p.id as SubscriptionPlan)}
          />
        ))}
      </Animated.View>

      {/* Price summary */}
      <Animated.View entering={FadeInDown.delay(500).duration(400)} style={priceAnim}>
        <View style={styles.priceSummary}>
          <Text style={styles.priceSummaryAmount}>{plan.displayInr}</Text>
          <Text style={styles.priceSummaryPeriod}>
            {plan.id === 'monthly' ? 'per month' : 'per year'}
          </Text>
          {plan.savingsPercent ? (
            <Text style={styles.priceSummaryNote}>
              That's just {plan.perMonthInr} — save {plan.savingsPercent}% vs monthly
            </Text>
          ) : null}
        </View>
      </Animated.View>

      {/* Payment buttons */}
      <Animated.View entering={FadeInDown.delay(560).duration(400)} style={styles.paymentButtons}>
        {/* Razorpay — primary for Indian users */}
        <Pressable
          onPress={() => handlePayment('razorpay')}
          disabled={!!loading}
          style={({ pressed }) => [
            styles.payBtn,
            styles.payBtnRazorpay,
            { opacity: pressed || (loading && loading !== 'razorpay') ? 0.55 : 1 },
          ]}
        >
          {loading === 'razorpay' ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="card-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.payBtnText}>Pay with Razorpay</Text>
            </>
          )}
        </Pressable>

        {/* Stripe — global */}
        <Pressable
          onPress={() => handlePayment('stripe')}
          disabled={!!loading}
          style={({ pressed }) => [
            styles.payBtn,
            styles.payBtnStripe,
            { opacity: pressed || (loading && loading !== 'stripe') ? 0.55 : 1 },
          ]}
        >
          {loading === 'stripe' ? (
            <ActivityIndicator color={P.primary} size="small" />
          ) : (
            <>
              <Ionicons name="globe-outline" size={18} color={P.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.payBtnText, { color: P.primary }]}>Pay with Card (Stripe)</Text>
            </>
          )}
        </Pressable>
      </Animated.View>

      {/* Legal */}
      <Animated.View entering={FadeInDown.delay(620).duration(400)}>
        <Text style={styles.legalText}>
          Subscriptions auto-renew. Cancel anytime from your account settings.
          By subscribing you agree to our{' '}
          <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
      </Animated.View>
    </ScrollView>
  )
}

// ─── SnoozyPlusScreen ─────────────────────────────────────────────────────────

export function SnoozyPlusScreen() {
  const closeProfilePanel = useStoryStore((s) => s.closeProfilePanel)
  const subscription = useStoryStore((s) => s.subscription)
  const isPlusActive = isActive(subscription)

  useBackHandler(closeProfilePanel)

  const handleManage = useCallback(() => {
    Alert.alert(
      'Manage subscription',
      'To cancel or update your subscription, visit your account settings.',
      [{ text: 'OK' }],
    )
  }, [])

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[P.bgDeep, P.bg, '#1A0A3C']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <StarField />

      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        {/* Close button */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.closeRow}>
          <Pressable
            onPress={closeProfilePanel}
            hitSlop={16}
            style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="close" size={22} color={P.inkSoft} />
          </Pressable>
        </Animated.View>

        {isPlusActive ? (
          <ActiveView onManage={handleManage} onClose={closeProfilePanel} />
        ) : (
          <PaywallView onClose={closeProfilePanel} />
        )}
      </SafeAreaView>

      <BackSwipeZone onBack={closeProfilePanel} />
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  closeRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Paywall ────────────────────────────────────────────────────────────────
  paywallContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  hero: { alignItems: 'center', paddingVertical: Spacing.xl },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(245,197,24,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,197,24,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 30,
    color: P.ink,
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  heroTagline: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 17,
    color: P.inkSoft,
    textAlign: 'center',
    lineHeight: 26,
  },

  featuresDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: P.divider },
  dividerlabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: P.inkMute,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245,197,24,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: P.ink,
    marginBottom: 2,
  },
  featureSubtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: P.inkMute,
    lineHeight: 17,
  },

  choosePlanTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: P.inkSoft,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },

  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surface,
    borderWidth: 1.5,
    borderColor: P.surfaceBorder,
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  planCardSelected: {
    borderColor: P.primary,
    backgroundColor: 'rgba(124,106,248,0.14)',
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: P.inkMute,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioSelected: { borderColor: P.primary },
  planRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: P.primary,
  },
  planInfo: { flex: 1 },
  planLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  planLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: P.inkSoft,
  },
  planLabelSelected: { color: P.ink },
  savingsBadge: {
    backgroundColor: 'rgba(245,197,24,0.18)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(245,197,24,0.3)',
  },
  savingsText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: P.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planPerMonth: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 12,
    color: P.inkMute,
  },
  planPerMonthSelected: { color: P.inkSoft },
  planPriceCol: { alignItems: 'flex-end' },
  planPrice: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: P.inkSoft,
  },
  planPriceSelected: { color: P.ink },
  planPricePeriod: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 11,
    color: P.inkMute,
  },
  planPricePeriodSelected: { color: P.inkSoft },

  priceSummary: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  priceSummaryAmount: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 42,
    color: P.ink,
    letterSpacing: -1,
  },
  priceSummaryPeriod: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 15,
    color: P.inkMute,
    marginTop: 2,
  },
  priceSummaryNote: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: P.gold,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  paymentButtons: { gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.md },
  payBtn: {
    height: 54,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  payBtnRazorpay: { backgroundColor: P.razorBlue },
  payBtnStripe: {
    backgroundColor: 'rgba(124,106,248,0.10)',
    borderWidth: 1.5,
    borderColor: P.primary,
  },
  payBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },

  legalText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    color: P.inkMute,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: Spacing.sm,
  },
  legalLink: { color: P.inkSoft, textDecorationLine: 'underline' },

  // ── Active subscription view ───────────────────────────────────────────────
  activeContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  activeHero: { alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.xl },
  activeIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,197,24,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,197,24,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  activeTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 32,
    color: P.ink,
    letterSpacing: -0.6,
    marginBottom: Spacing.sm,
  },
  activeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76,175,125,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(76,175,125,0.3)',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: P.success,
  },
  activeBadgeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: P.success,
  },
  activePlanText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: P.inkMute,
  },

  expiryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.surfaceBorder,
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  expiryLabel: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 11,
    color: P.inkMute,
    marginBottom: 2,
  },
  expiryDate: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: P.ink,
  },
  expiryWarning: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(229,115,115,0.18)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  expiryWarningText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: '#FF8A8A',
  },

  activeSectionTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: P.inkMute,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
  },

  activeFooter: { marginTop: Spacing.xl, gap: Spacing.sm },
  manageButton: {
    height: 50,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.surfaceBorder,
  },
  manageButtonText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: P.inkSoft,
  },
  closeTextButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  closeTextButtonText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: P.inkMute,
  },
})
