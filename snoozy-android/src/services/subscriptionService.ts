import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Subscription,
  DEFAULT_SUBSCRIPTION,
  SubscriptionPlan,
  SubscriptionProvider,
} from '@/types/subscription'

export const SUBSCRIPTION_STORAGE_KEY = 'snoozy_subscription_v1'

export async function loadSubscription(): Promise<Subscription> {
  try {
    const raw = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SUBSCRIPTION }

    const sub: Subscription = JSON.parse(raw)

    // Auto-expire if past end date
    if (sub.status === 'active' && sub.expiresAt) {
      if (new Date(sub.expiresAt) < new Date()) {
        const expired: Subscription = { ...sub, status: 'expired' }
        await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(expired))
        return expired
      }
    }

    return sub
  } catch {
    return { ...DEFAULT_SUBSCRIPTION }
  }
}

export async function activateSubscription(params: {
  plan: SubscriptionPlan
  provider: SubscriptionProvider
  transactionId: string
}): Promise<Subscription> {
  const now = new Date()
  const expiresAt = new Date(now)

  if (params.plan === 'monthly') {
    expiresAt.setMonth(expiresAt.getMonth() + 1)
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  }

  const sub: Subscription = {
    status: 'active',
    plan: params.plan,
    provider: params.provider,
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    transactionId: params.transactionId,
  }

  await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(sub))
  return sub
}

export async function persistSubscription(sub: Subscription): Promise<void> {
  await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(sub))
}

export function isActive(sub: Subscription): boolean {
  return (
    sub.status === 'active' &&
    (!sub.expiresAt || new Date(sub.expiresAt) > new Date())
  )
}

export function formatExpiry(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function daysRemaining(isoDate: string): number {
  const diff = new Date(isoDate).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
