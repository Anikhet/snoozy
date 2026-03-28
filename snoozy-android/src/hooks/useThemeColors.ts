import { useColorScheme } from 'react-native'
import { Colors, ThemeColors } from '@/config/tokens'

/**
 * Returns the correct color set based on the device's color scheme.
 */
export function useThemeColors(): { colors: ThemeColors; isDark: boolean } {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'
  return { colors: isDark ? Colors.dark : Colors.light, isDark }
}
