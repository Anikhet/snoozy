import { useMemo } from 'react'

export interface RegionInfo {
  isIndia: boolean
  /** BCP-47 locale tag resolved from the device, e.g. "en-IN" or "en-US" */
  locale: string
  /** ISO 3166-1 alpha-2 country code inferred from locale, e.g. "IN" or "US" */
  country: string | null
}

/**
 * Detects the device region using the built-in Intl API (no permissions, no
 * network — available in Hermes and JavaScriptCore on all RN versions).
 *
 * Falls back to null / non-India if Intl is unavailable (old JSC).
 */
export function useRegion(): RegionInfo {
  return useMemo(() => {
    try {
      const locale =
        Intl.DateTimeFormat().resolvedOptions().locale ??
        Intl.NumberFormat().resolvedOptions().locale ??
        ''

      // BCP-47 tags encode region as the second subtag when present: "en-IN", "hi-IN",
      // "en-US", "zh-Hans-CN", etc.  The region subtag is always uppercase alpha-2/alpha-3.
      const parts = locale.split('-')
      // Walk backwards — region is the last uppercase-only 2-letter segment
      let country: string | null = null
      for (let i = parts.length - 1; i >= 1; i--) {
        if (/^[A-Z]{2}$/.test(parts[i])) {
          country = parts[i]
          break
        }
      }

      return { isIndia: country === 'IN', locale, country }
    } catch {
      return { isIndia: false, locale: '', country: null }
    }
  }, [])
}
