import 'server-only';

import Stripe from 'stripe';
import { stripeSecretKey } from '@/lib/env';
import type { SubscriptionPlan } from '@/lib/plans';

let client: Stripe | null = null;

export function stripe(): Stripe {
  // Constructed on first use, not at module load, so importing this file
  // doesn't throw on a machine with no Stripe keys (e.g. `next build` for
  // someone only touching the UI).
  if (!client) {
    client = new Stripe(stripeSecretKey(), {
      apiVersion: '2026-07-29.dahlia',
      typescript: true,
      appInfo: { name: 'Co-op' },
    });
  }
  return client;
}

/**
 * Price ids live in the environment, not the database: they differ between
 * Stripe test mode and live mode and so can't be committed. lib/plans.ts holds
 * the amounts we display; this is only the mapping to Stripe's ids.
 */
type BillingKey =
  | 'creative_basic_monthly' | 'creative_basic_annual'
  | 'creative_premium_monthly' | 'creative_premium_annual'
  | 'business_standard_monthly' | 'business_standard_annual';

const PRICE_ENV: Record<BillingKey, string> = {
  creative_basic_monthly: 'STRIPE_PRICE_CREATIVE_BASIC_MONTHLY',
  creative_basic_annual: 'STRIPE_PRICE_CREATIVE_BASIC_ANNUAL',
  creative_premium_monthly: 'STRIPE_PRICE_CREATIVE_PREMIUM_MONTHLY',
  creative_premium_annual: 'STRIPE_PRICE_CREATIVE_PREMIUM_ANNUAL',
  business_standard_monthly: 'STRIPE_PRICE_BUSINESS_STANDARD_MONTHLY',
  business_standard_annual: 'STRIPE_PRICE_BUSINESS_STANDARD_ANNUAL',
};

export function billingKeyFor(plan: SubscriptionPlan, interval: 'monthly' | 'annual'): BillingKey | null {
  const key = `${plan}_${interval}` as BillingKey;
  return key in PRICE_ENV ? key : null;
}

export function priceIdFor(plan: SubscriptionPlan, interval: 'monthly' | 'annual'): string | null {
  const key = billingKeyFor(plan, interval);
  return key ? (process.env[PRICE_ENV[key]] ?? null) : null;
}

/**
 * The reverse lookup, used by the webhook. Taken from the price the customer
 * is actually being billed for (not from checkout metadata), so a plan change
 * made inside Stripe's own billing portal is still picked up correctly.
 */
export function planForPrice(priceId: string | null | undefined): SubscriptionPlan | null {
  if (!priceId) return null;
  for (const [key, envName] of Object.entries(PRICE_ENV)) {
    if (process.env[envName] === priceId) return key.replace(/_monthly$|_annual$/, '') as SubscriptionPlan;
  }
  return null;
}
