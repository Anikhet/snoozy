export type SubscriptionPlan = 'monthly' | 'annual'
export type SubscriptionProvider = 'stripe' | 'razorpay'
export type SubscriptionStatus = 'free' | 'active' | 'expired' | 'cancelled'

export interface Subscription {
  status: SubscriptionStatus
  plan: SubscriptionPlan | null
  provider: SubscriptionProvider | null
  startedAt: string | null
  expiresAt: string | null
  transactionId: string | null
}

export const DEFAULT_SUBSCRIPTION: Subscription = {
  status: 'free',
  plan: null,
  provider: null,
  startedAt: null,
  expiresAt: null,
  transactionId: null,
}
