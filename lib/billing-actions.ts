'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { stripe, priceIdFor } from '@/lib/stripe';
import { stripeConfigured } from '@/lib/env';
import type { SubscriptionPlan } from '@/lib/plans';

/**
 * Everything a signed-in user can do that involves their card. Two rules hold
 * across this file, same as the technical pattern this was adapted from:
 *
 *   1. Nothing here grants a plan. Checkout only produces a *request* to be
 *      paid — the plan is applied only by the webhook route calling
 *      apply_subscription() with the service role. Closing the browser at the
 *      right moment grants nothing.
 *   2. The amount is whatever Stripe's Price says, never something read from
 *      the form. The client only chooses *which* plan and *which* interval.
 */

const NOT_CONFIGURED = 'Card payments are not switched on for this deployment yet.';

async function db() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

function siteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

/** The customer id from any earlier subscription, so a plan change attaches to
 *  the same Stripe customer instead of creating a second one. */
async function existingCustomerId(supabase: Awaited<ReturnType<typeof db>>['supabase'], userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .not('stripe_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.stripe_customer_id ?? null;
}

/**
 * "Subscribe now, don't pay until your first match": a user gets the long
 * placeholder trial exactly once, the first time they ever subscribe — not
 * on every checkout. Someone who has already matched (whether they're an
 * active paying subscriber switching plans, or a pre-migration account with
 * no subscription at all hitting the needs_plan_setup gate) has already
 * passed that point and bills immediately instead.
 */
async function eligibleForFirstMatchTrial(supabase: Awaited<ReturnType<typeof db>>['supabase'], userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('matches')
    .select('id')
    .or(`business_id.eq.${userId},creative_id.eq.${userId}`)
    .eq('is_matched', true)
    .limit(1)
    .maybeSingle();
  return !data;
}

export async function startSubscriptionCheckout(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const { supabase, user } = await db();
  if (!user) redirect('/login');

  const plan = formData.get('plan') as SubscriptionPlan | null;
  const interval = (formData.get('interval') as 'monthly' | 'annual') ?? 'monthly';
  if (!plan) return { error: 'Choose a plan.' };

  const [{ data: creative }, { data: business }] = await Promise.all([
    supabase.from('creative_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('business_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
  ]);
  const isCreativePlan = plan === 'creative_basic' || plan === 'creative_premium';
  if (isCreativePlan && !creative) return { error: 'That plan is for creative accounts.' };
  if (!isCreativePlan && !business) return { error: 'That plan is for business accounts.' };

  if (!stripeConfigured()) return { error: NOT_CONFIGURED };
  const price = priceIdFor(plan, interval);
  if (!price) return { error: NOT_CONFIGURED };

  const customer = await existingCustomerId(supabase, user.id);
  const origin = siteOrigin();
  const trialEligible = await eligibleForFirstMatchTrial(supabase, user.id);

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    ...(customer ? { customer } : { customer_email: user.email ?? undefined }),
    client_reference_id: user.id,
    subscription_data: {
      metadata: { user_id: user.id },
      // Ended early by lib/billing-activation.ts the moment this user gets
      // their first match — see 0020_pay_on_first_match.sql. A long
      // placeholder, not the actual intended trial length: Stripe trials are
      // day-based, there's no "trial until an event" primitive, so this is
      // just long enough that it never expires on its own before the event
      // fires (or ever, for someone who never matches).
      ...(trialEligible ? { trial_period_days: 365 } : {}),
    },
    success_url: `${origin}/billing?checkout=done`,
    cancel_url: `${origin}/billing`,
    allow_promotion_codes: true,
  });

  if (!session.url) return { error: 'Stripe did not return a checkout page. Try again.' };
  redirect(session.url);
}

/** Cancelling, changing card, switching interval — all in Stripe's own portal,
 *  never re-implemented here. Only the webhook may write subscription state. */
export async function openBillingPortal(): Promise<void> {
  const { supabase, user } = await db();
  if (!user) redirect('/login');
  if (!stripeConfigured()) redirect('/billing?error=not_configured');

  const customer = await existingCustomerId(supabase, user.id);
  if (!customer) redirect('/billing?error=no_customer');

  const portal = await stripe().billingPortal.sessions.create({
    customer,
    return_url: `${siteOrigin()}/billing`,
  });
  redirect(portal.url);
}
