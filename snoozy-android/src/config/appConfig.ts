/**
 * Backend URL: Android emulator uses 10.0.2.2 to reach host localhost.
 * iOS simulator can use localhost directly.
 */
// Set to true to skip login/auth screens during development
export const DEV_MODE = false

export const AppConfig = {
  backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.10:3001',
  maxStoryLength: 5000,
  ageRange: Array.from({ length: 8 }, (_, i) => i + 3),
  privacyPolicyUrl: 'https://snoozyapp.com/privacy',
  termsOfServiceUrl: 'https://snoozyapp.com/terms',
  supportEmail: 'support@snoozyapp.com',
} as const
