import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Service-role client — bypasses RLS entirely. Used ONLY by the Stripe webhook
 * route to call apply_subscription(), which is itself revoked from every other
 * role. Never import this into anything that renders for or is triggered by a
 * browser request.
 */
export function createServiceClient() {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — the Stripe webhook cannot apply subscriptions without it.');
  }
  return createSupabaseClient(supabaseUrl!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
