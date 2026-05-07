import type { ComponentProps } from 'react'
import type { Ionicons } from '@expo/vector-icons'

type IoniconName = ComponentProps<typeof Ionicons>['name']

export interface PlanConfig {
  id: 'monthly' | 'annual'
  label: string
  priceInr: number
  priceUsd: number
  displayInr: string
  displayUsd: string
  perMonthInr: string
  perMonthUsd: string
  savingsPercent?: number
  /** Stripe Price ID — set EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID / EXPO_PUBLIC_STRIPE_ANNUAL_PRICE_ID */
  stripePriceId: string
  /** Razorpay Plan ID — set EXPO_PUBLIC_RAZORPAY_MONTHLY_PLAN_ID / EXPO_PUBLIC_RAZORPAY_ANNUAL_PLAN_ID */
  razorpayPlanId: string
}

export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    id: 'monthly',
    label: 'Monthly',
    priceInr: 299,
    priceUsd: 4.99,
    displayInr: '₹299',
    displayUsd: '$4.99',
    perMonthInr: '₹299/month',
    perMonthUsd: '$4.99/month',
    stripePriceId: process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID ?? '',
    razorpayPlanId: process.env.EXPO_PUBLIC_RAZORPAY_MONTHLY_PLAN_ID ?? '',
  },
  {
    id: 'annual',
    label: 'Annual',
    priceInr: 1999,
    priceUsd: 39.99,
    displayInr: '₹1999',
    displayUsd: '$39.99',
    perMonthInr: '₹167/month',
    perMonthUsd: '$3.33/month',
    savingsPercent: 44,
    stripePriceId: process.env.EXPO_PUBLIC_STRIPE_ANNUAL_PRICE_ID ?? '',
    razorpayPlanId: process.env.EXPO_PUBLIC_RAZORPAY_ANNUAL_PLAN_ID ?? '',
  },
]

export interface FeatureItem {
  icon: IoniconName
  title: string
  subtitle: string
}

export const PLUS_FEATURES: FeatureItem[] = [
  {
    icon: 'infinite-outline',
    title: 'Unlimited stories',
    subtitle: 'Create as many bedtime stories as you want, every night',
  },
  {
    icon: 'mic-outline',
    title: 'Premium narrator voices',
    subtitle: 'Exclusive, silky-smooth voices that bring stories to life',
  },
  {
    icon: 'planet-outline',
    title: 'Exclusive story worlds',
    subtitle: 'Unlock enchanted kingdoms, cosmic oceans & secret gardens',
  },
  {
    icon: 'cloud-download-outline',
    title: 'Download for offline',
    subtitle: 'Save stories and play them anywhere, even without Wi-Fi',
  },
  {
    icon: 'flash-outline',
    title: 'Priority generation',
    subtitle: 'Your stories are crafted faster — no waiting',
  },
  {
    icon: 'sparkles-outline',
    title: 'New themes every week',
    subtitle: 'Fresh adventures added regularly, just for Plus members',
  },
]

export const FREE_STORY_LIMIT = 3
