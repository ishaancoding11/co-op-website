import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe, planForPrice } from '@/lib/stripe';
import { stripeWebhookSecret } from '@/lib/env';
import { createServiceClient } from '@/utils/supabase/service';

/**
 * The only place in the app where a subscription is confirmed. Everything
 * upstream (Checkout, plan buttons) is a request; this route turns a request
 * into a fact, which is why it runs with the service role and why the first
 * thing it does is prove the request actually came from Stripe.
 *
 * Idempotent by construction: apply_subscription() upserts on
 * stripe_subscription_id, so a re-delivered event can't double-apply a plan.
 * Any error here returns non-2xx so Stripe retries rather than the failure
 * being silently swallowed.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function subscriptionStatus(status: Stripe.Subscription.Status): 'active' | 'pending' | 'past_due' | 'cancelled' | 'expired' | null {
  switch (status) {
    case 'active':
      return 'active';
    // The placeholder pre-first-match trial — $0, unbilled. Ended early by
    // lib/billing-activation.ts calling trial_end='now', which flips this
    // event's status back to 'active' on the next delivery.
    case 'trialing':
      return 'pending';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'paused':
      return 'expired';
    // 'incomplete' means the first payment hasn't gone through yet. Recording
    // it would retire whatever the user is currently on (apply_subscription
    // cancels the previous active row), so a failed upgrade would silently
    // downgrade them. Ignored instead.
    case 'incomplete':
    case 'incomplete_expired':
      return null;
    default:
      return null;
  }
}

function isoFrom(seconds: number | null | undefined): string | null {
  return typeof seconds === 'number' ? new Date(seconds * 1000).toISOString() : null;
}

async function handleSubscription(sub: Stripe.Subscription): Promise<void> {
  const status = subscriptionStatus(sub.status);
  if (!status) return;

  const userId = sub.metadata?.user_id;
  if (!userId) throw new Error(`subscription ${sub.id} has no user_id metadata`);

  const item = sub.items.data[0];
  const priceId = typeof item?.price === 'string' ? item.price : item?.price?.id;
  const plan = planForPrice(priceId);
  if (!plan) throw new Error(`subscription ${sub.id} is on a price this deployment does not know`);

  const start = isoFrom(item?.current_period_start);
  const end = isoFrom(item?.current_period_end);
  if (!start || !end) throw new Error(`subscription ${sub.id} has no billing period`);

  const { error } = await createServiceClient().rpc('apply_subscription', {
    p_user: userId,
    p_plan: plan,
    p_status: status,
    p_period_start: start,
    p_period_end: end,
    p_customer_ref: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
    p_subscription_ref: sub.id,
    p_cancel_at_period_end: sub.cancel_at_period_end,
  });

  if (error) throw new Error(`apply_subscription failed: ${error.message}`);
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new NextResponse('missing signature', { status: 400 });

  // Raw text, not request.json() — the signature covers the exact bytes, and
  // re-serializing a parsed object would change them.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(body, signature, stripeWebhookSecret());
  } catch {
    return new NextResponse('invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscription(event.data.object);
        break;
      default:
        // Everything else is acknowledged and ignored — returning an error for
        // an event we didn't ask for would make Stripe retry it forever.
        break;
    }
  } catch (error) {
    console.error('stripe webhook', event.type, error);
    return new NextResponse('handler failed', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
