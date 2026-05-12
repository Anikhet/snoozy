/**
 * Feature flags — flip these to enable/disable features app-wide.
 *
 * VOICE_CLONING_ENABLED: disabled pending App Store compliance work.
 * Re-enabling requires: privacy policy update, in-app consent screen,
 * GDPR/CCPA data deletion flow, and NSMicrophoneUsageDescription review.
 * See Apple guideline 5.1.2(i) (third-party AI data sharing, Nov 2025).
 */
export const VOICE_CLONING_ENABLED = false

/**
 * SUBSCRIPTIONS_ENABLED: disabled pending StoreKit 2 / expo-iap integration.
 * Apple requires StoreKit for all in-app digital purchases (guideline 3.1.1).
 * Re-enabling requires replacing paymentService.ts with expo-iap and
 * creating subscription products in App Store Connect.
 */
export const SUBSCRIPTIONS_ENABLED = false
