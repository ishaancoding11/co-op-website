import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Card, Tag, EmptyState } from '@/components/ui';
import { PLAN_LABELS, type SubscriptionPlan } from '@/lib/plans';
import { Pager, SearchBar } from '../admin-ui';

type Row = {
  user_id: string; display_name: string; kind: 'creative' | 'business';
  plan: SubscriptionPlan | null; trial_ends_at: string | null;
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'expired' | null;
  current_period_end: string | null;
};

function statusFor(r: Row): { label: string; tone: 'sea' | 'accent' | 'neutral' } {
  if (r.plan && r.subscription_status === 'active') return { label: PLAN_LABELS[r.plan], tone: 'sea' };
  if (r.trial_ends_at && new Date(r.trial_ends_at) > new Date()) return { label: 'Trial', tone: 'accent' };
  return { label: 'Expired / no plan', tone: 'neutral' };
}

export default async function AdminBilling({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const perPage = 50;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.rpc('admin_subscriptions', {
    p_search: q?.trim() || null, p_limit: perPage, p_offset: (page - 1) * perPage,
  });
  const rows = (data ?? []) as Row[];

  return (
    <div>
      <SearchBar action="/admin/billing" value={q} placeholder="Search by name…" />

      {error ? <p className="text-sm text-red-700 mt-4">Could not load subscriptions.</p> : null}
      {!error && !rows.length ? <EmptyState title="Nobody matches that search" /> : null}

      <div className="mt-4 divide-y divide-line rounded-3xl border border-line bg-card overflow-hidden">
        {rows.map(r => {
          const s = statusFor(r);
          return (
            <div key={`${r.kind}-${r.user_id}`} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{r.display_name}</p>
                <p className="text-xs text-muted capitalize">{r.kind}{r.trial_ends_at ? ` · trial ends ${new Date(r.trial_ends_at).toLocaleDateString('en-US')}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <Tag tone={s.tone}>{s.label}</Tag>
                {r.current_period_end && <span className="text-xs text-muted">renews {new Date(r.current_period_end).toLocaleDateString('en-US')}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <Pager page={page} count={rows.length} perPage={perPage} extraParams={q ? { q } : {}} />
    </div>
  );
}
