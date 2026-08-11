import 'server-only';

import { stripe } from '@/lib/stripe';
import type { createClient } from '@/utils/supabase/server';

/**
 * Drains the first-match billing outbox for the signed-in user (see
 * billing_activation_queue / match_side_effects in
 * 0020_pay_on_first_match.sql). Called from getViewer() — every authenticated
 * page load — rather than from a cron/worker, since there's no infra for one
 * here and this is cheap: the common case is one indexed read that finds
 * nothing.
 *
 * Ending a Stripe trial early (trial_end: 'now') is what actually starts
 * billing — everything downstream (period dates, status) is picked up by the
 * existing webhook via the customer.subscription.updated event this call
 * itself triggers, so nothing else needs to happen here.
 */
export async function activateFirstMatchBillingIfNeeded(supabase: ReturnType<typeof createClient>, userId: string): Promise<void> {
  const { data } = await supabase.rpc('pending_first_match_billing');
  const row = (Array.isArray(data) ? data[0] : data) as { has_unprocessed: boolean; stripe_subscription_id: string | null } | null;
  if (!row?.has_unprocessed) return;

  if (row.stripe_subscription_id) {
    try {
      await stripe().subscriptions.update(row.stripe_subscription_id, { trial_end: 'now' });
    } catch (err) {
      // Leave the outbox row unprocessed — retried on the user's next page load.
      console.error(`[billing] failed to end trial for user ${userId}:`, err);
      return;
    }
  }
  // No stripe_subscription_id means either a pre-migration account with no
  // subscription at all (needs_plan_setup() takes over from here) or a
  // subscription that already converted out of 'pending' on its own —
  // either way, nothing left to do but mark this outbox row handled.
  await supabase.rpc('mark_first_match_billing_processed');
}
