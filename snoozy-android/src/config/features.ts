/**
 * Feature flags — flip these to enable/disable features app-wide.
 *
 * VOICE_CLONING_ENABLED: disabled pending App Store compliance work.
 * Re-enabling requires: privacy policy update, in-app consent screen,
 * GDPR/CCPA data deletion flow, and NSMicrophoneUsageDescription review.
 * See Apple guideline 5.1.2(i) (third-party AI data sharing, Nov 2025).
 */
export const VOICE_CLONING_ENABLED = false
