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
    features: ['Up to 5 job applications/acceptances per month', 'Full portfolio & profile', 'Direct messaging with businesses'],
  },
  creative_premium: {
    monthly: 19.99, annual: null, annualSavingsLabel: null,
    blurb: 'For creatives who want to be first in line.',
    features: ['Unlimited job applications/acceptances', 'Priority placement in search & browse', 'Full portfolio & profile'],
  },
  business_standard: {
    monthly: 54.99, annual: 559.99, annualSavingsLabel: 'Save $99.89/year (~15% off)',
    blurb: 'For businesses hiring local creatives regularly.',
    features: ['Up to 15 active job posts at a time', 'Priority placement in the job feed', 'Unlimited applicant browsing & messaging'],
  },
};

export const TRIAL_DAYS = 30;
