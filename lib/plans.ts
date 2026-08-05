export type SubscriptionPlan = 'creative_basic' | 'creative_premium' | 'business_standard';

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  creative_basic: 'Creative Basic',
  creative_premium: 'Creative Premium',
  business_standard: 'Business',
};

/** Mirrors plan_limits in 0008_subscriptions.sql — kept here only for display;
 *  the database is the source of truth for enforcement. */
export const PLAN_PRICING: Record<SubscriptionPlan, {
  monthly: number; annual: number | null; annualSavingsLabel: string | null;
  blurb: string; features: string[];
}> = {
  creative_basic: {
    monthly: 11.99, annual: 119.99, annualSavingsLabel: 'Save $23.89/year (~17% off)',
    blurb: 'For creatives picking up local work at a steady pace.',
    features: ['Up to 5 job offers per month', 'Full portfolio & profile', 'Reviews & ratings', 'Direct chat with businesses'],
  },
  creative_premium: {
    monthly: 19.99, annual: 199.99, annualSavingsLabel: 'Save $39.89/year (~17% off)',
    blurb: 'For creatives who want to be first in line.',
    features: ['Unlimited job offers', 'Everything in Basic', '“Verified” badge', 'Priority in search results', 'Featured profile — top of the list'],
  },
  business_standard: {
    monthly: 54.99, annual: 559.99, annualSavingsLabel: 'Save $99.89/year (~15% off)',
    blurb: 'For businesses hiring local creatives regularly.',
    features: ['Unlimited job posts', 'Access to Verified creatives', 'Priority job listing — shown higher', 'Unlimited direct chat', 'Reorder & full job history', '“Verified Business” badge', 'Priority support'],
  },
};

/** Tenge pricing for the manual (Kaspi/bank-transfer) subscription path — Stripe
 *  doesn't operate in Kazakhstan, so KZT users request a plan and staff confirm
 *  payment. Mirrors the price_*_kzt columns seeded in 0011_geo_currency_i18n.sql.
 *  Whole tenge, not minor units. */
export const PLAN_PRICING_KZT: Record<SubscriptionPlan, { monthly: number; annual: number | null }> = {
  creative_basic: { monthly: 5990, annual: 59900 },
  creative_premium: { monthly: 9990, annual: 99900 },
  business_standard: { monthly: 27990, annual: 279900 },
};

export const TRIAL_DAYS = 30;
