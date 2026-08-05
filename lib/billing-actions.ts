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

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    ...(customer ? { customer } : { customer_email: user.email ?? undefined }),
    client_reference_id: user.id,
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${origin}/billing?checkout=done`,
    cancel_url: `${origin}/billing`,
    allow_promotion_codes: true,
  });

  if (!session.url) return { error: 'Stripe did not return a checkout page. Try again.' };
  redirect(session.url);
}

/**
 * Kazakhstan path: Stripe doesn't operate there, so a KZT user can't check out
 * with a card. Instead they file a request that staff confirm once payment lands
 * (Kaspi transfer / invoice). Like Stripe checkout above, this grants nothing on
 * its own — request_manual_subscription() only inserts a pending row, and the
 * plan is applied only when an admin calls admin_resolve_manual_subscription().
 */
export async function requestManualSubscription(prev: unknown, formData: FormData): Promise<{ error?: string; requested?: boolean }> {
  const { supabase, user } = await db();
  if (!user) redirect('/login');

  const plan = formData.get('plan') as SubscriptionPlan | null;
  const interval = (formData.get('interval') as 'monthly' | 'annual') ?? 'monthly';
  if (!plan) return { error: 'Choose a plan.' };

  const { error } = await supabase.rpc('request_manual_subscription', { p_plan: plan, p_interval: interval });
  if (error) {
    if (error.message.includes('PLAN_ROLE_MISMATCH')) return { error: 'That plan is for a different account type.' };
    if (error.message.includes('PLAN_NOT_OFFERED_IN_KZT')) return { error: 'This plan isn’t available for tenge payment yet.' };
    return { error: 'Could not submit your request. Try again in a moment.' };
  }
  return { requested: true };
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
