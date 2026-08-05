import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { resolveManualSubscription } from '@/lib/admin-actions';
import { EmptyState, Tag } from '@/components/ui';
import { PLAN_LABELS, type SubscriptionPlan } from '@/lib/plans';
import { formatMoney } from '@/lib/types';

type QueueRow = {
  id: string; user_id: string; display_name: string | null;
  plan: SubscriptionPlan; interval: 'monthly' | 'annual';
  amount_kzt: number; status: 'pending' | 'confirmed' | 'rejected'; created_at: string;
};

const TONE: Record<QueueRow['status'], 'accent' | 'sea' | 'neutral'> = {
  pending: 'accent', confirmed: 'sea', rejected: 'neutral',
};

export default async function AdminKzt() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc('admin_manual_subscription_queue');
  const rows = (data ?? []) as QueueRow[];

  return (
    <div>
      <p className="text-sm text-muted">
        Tenge subscription requests. Stripe doesn&rsquo;t operate in Kazakhstan, so these are paid by Kaspi/bank transfer —
        confirm a request only once you&rsquo;ve verified the payment landed, and it grants the plan immediately.
      </p>

      {error ? <p className="text-sm text-red-700 mt-4">Could not load the request queue.</p> : null}
      {!error && !rows.length ? <EmptyState title="No requests yet" body="Tenge plan requests from Kazakhstan users show up here for confirmation." /> : null}

      <div className="mt-4 divide-y divide-line rounded-3xl border border-line bg-card overflow-hidden">
        {rows.map(r => (
          <div key={r.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{r.display_name ?? 'User'}</p>
              <p className="text-xs text-muted">
                {PLAN_LABELS[r.plan]} · {r.interval === 'annual' ? 'annual' : 'monthly'} · {formatMoney(r.amount_kzt, 'KZT')}
                {' · '}{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {r.status === 'pending' ? (
                <>
                  <form action={resolveManualSubscription.bind(null, r.id, true)}>
                    <button className="rounded-full bg-accent-soft text-accent px-4 py-1.5 text-sm font-medium hover:bg-line">Confirm payment</button>
                  </form>
                  <form action={resolveManualSubscription.bind(null, r.id, false)}>
                    <button className="rounded-full border border-line px-4 py-1.5 text-sm text-muted font-medium hover:bg-background">Reject</button>
                  </form>
                </>
              ) : (
                <Tag tone={TONE[r.status]}>{r.status}</Tag>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
