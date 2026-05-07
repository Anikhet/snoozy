/**
 * Payment gateway abstraction for Snoozy Plus.
 *
 * Stripe:   requires @stripe/stripe-react-native + StripeProvider wrapping App.tsx
 *           env vars: EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
 *           backend:  POST /api/payments/stripe/create-intent → { clientSecret }
 *
 * Razorpay: requires react-native-razorpay (bare workflow) or WebView checkout
 *           env vars: EXPO_PUBLIC_RAZORPAY_KEY_ID
 *           backend:  POST /api/payments/razorpay/create-order → { orderId, amount, currency }
 *
 * Both flows follow the same contract: return PaymentOutcome so callers are
 * provider-agnostic. Replace the placeholder blocks below with real SDK calls
 * once the native modules are installed.
 */

import { AppConfig } from '@/config/appConfig'
import { SubscriptionPlan } from '@/types/subscription'

export interface PaymentSuccess {
  success: true
  transactionId: string
  provider: 'stripe' | 'razorpay'
}

export interface PaymentFailure {
  success: false
  cancelled: boolean
  message: string
}

export type PaymentOutcome = PaymentSuccess | PaymentFailure

// ─── Stripe ───────────────────────────────────────────────────────────────────

/**
 * Creates a payment intent on the backend, then presents Stripe's payment sheet.
 *
 * To activate:
 *   1. npx expo install @stripe/stripe-react-native
 *   2. Wrap App.tsx root with <StripeProvider publishableKey={EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
 *   3. Replace the TODO block below with the initPaymentSheet + presentPaymentSheet calls
 */
export async function initiateStripePayment(params: {
  plan: SubscriptionPlan
  userEmail: string
  getToken: () => Promise<string | null>
}): Promise<PaymentOutcome> {
  try {
    const token = await params.getToken()
    if (!token) throw new Error('Unauthenticated')

    // Step 1: Create payment intent on backend
    const res = await fetch(`${AppConfig.backendUrl}/api/payments/stripe/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan: params.plan, email: params.userEmail }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as { message?: string }).message ?? 'Server error')
    }

    const { clientSecret } = (await res.json()) as { clientSecret: string }

    // Step 2: Present Stripe payment sheet
    // TODO — uncomment once @stripe/stripe-react-native is installed:
    //
    // import { useStripe } from '@stripe/stripe-react-native'
    // const { initPaymentSheet, presentPaymentSheet } = useStripe()
    //
    // const { error: initError } = await initPaymentSheet({
    //   merchantDisplayName: 'Snoozy',
    //   paymentIntentClientSecret: clientSecret,
    //   defaultBillingDetails: { email: params.userEmail },
    //   appearance: { colors: { primary: '#5B5BD6' } },
    // })
    // if (initError) throw new Error(initError.message)
    //
    // const { error: presentError } = await presentPaymentSheet()
    // if (presentError?.code === 'Canceled') return { success: false, cancelled: true, message: 'Cancelled' }
    // if (presentError) throw new Error(presentError.message)
    //
    // const transactionId = clientSecret.split('_secret_')[0]   // payment intent ID
    // return { success: true, transactionId, provider: 'stripe' }

    // ── Placeholder (dev / pre-SDK) ──────────────────────────────────────────
    // Simulates a successful payment. Remove this block and use the SDK above.
    void clientSecret
    await new Promise((r) => setTimeout(r, 1200))
    const transactionId = `pi_mock_${Date.now()}`
    return { success: true, transactionId, provider: 'stripe' }
    // ─────────────────────────────────────────────────────────────────────────
  } catch (err: unknown) {
    const e = err as { code?: string | number; message?: string }
    const cancelled = e?.code === 'Canceled' || e?.code === 0
    return { success: false, cancelled: !!cancelled, message: e?.message ?? String(err) }
  }
}

// ─── Razorpay ────────────────────────────────────────────────────────────────

/**
 * Creates a Razorpay order on the backend, then opens the Razorpay checkout.
 *
 * To activate (bare workflow):
 *   1. npm install react-native-razorpay && npx pod-install
 *   2. Replace the TODO block below with RazorpayCheckout.open(options)
 *
 * For managed Expo workflow, use the WebView-based checkout approach and
 * swap the TODO block with a navigation to a RazorpayWebViewScreen.
 */
export async function initiateRazorpayPayment(params: {
  plan: SubscriptionPlan
  userEmail: string
  userName: string
  userPhone?: string
  getToken: () => Promise<string | null>
}): Promise<PaymentOutcome> {
  try {
    const token = await params.getToken()
    if (!token) throw new Error('Unauthenticated')

    // Step 1: Create Razorpay order on backend
    const res = await fetch(`${AppConfig.backendUrl}/api/payments/razorpay/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan: params.plan }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error((body as { message?: string }).message ?? 'Server error')
    }

    const { orderId, amount, currency } = (await res.json()) as {
      orderId: string
      amount: number
      currency: string
    }

    const keyId = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? ''

    // Step 2: Open Razorpay checkout
    // TODO — uncomment once react-native-razorpay is installed:
    //
    // import RazorpayCheckout from 'react-native-razorpay'
    // const options = {
    //   key: keyId,
    //   amount: String(amount),
    //   currency,
    //   order_id: orderId,
    //   name: 'Snoozy',
    //   description: params.plan === 'monthly' ? 'Snoozy Plus Monthly' : 'Snoozy Plus Annual',
    //   image: 'https://your-cdn.com/snoozy-logo.png',
    //   prefill: { email: params.userEmail, contact: params.userPhone ?? '', name: params.userName },
    //   theme: { color: '#5B5BD6' },
    // }
    // const data = await RazorpayCheckout.open(options)
    // return { success: true, transactionId: data.razorpay_payment_id, provider: 'razorpay' }

    // ── Placeholder (dev / pre-SDK) ──────────────────────────────────────────
    void orderId; void amount; void currency; void keyId
    await new Promise((r) => setTimeout(r, 1200))
    const transactionId = `rzp_mock_${Date.now()}`
    return { success: true, transactionId, provider: 'razorpay' }
    // ─────────────────────────────────────────────────────────────────────────
  } catch (err: unknown) {
    const e = err as { code?: string | number; message?: string }
    // Razorpay SDK returns code 0 on user cancellation
    const cancelled = e?.code === 0 || String(e?.message).includes('cancel')
    return { success: false, cancelled: !!cancelled, message: e?.message ?? String(err) }
  }
}
