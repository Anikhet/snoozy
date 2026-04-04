import { Platform } from 'react-native'

/**
 * Backend URL: Android emulator uses 10.0.2.2 to reach host localhost.
 * iOS simulator can use localhost directly.
 */
export const AppConfig = {
  backendUrl: 'http://192.168.1.10:3001',
  maxStoryLength: 5000,
  ageRange: Array.from({ length: 10 }, (_, i) => i + 1),
} as const
