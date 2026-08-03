import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Stat } from './admin-ui';

type Overview = {
  creatives_total: number; businesses_total: number;
  jobs_active: number;
  matches_last_7d: number;
  new_creatives_this_week: number; new_businesses_this_week: number;
  creative_basic_active: number; creative_premium_active: number; business_standard_active: number;
};

export default async function AdminOverview() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = (await supabase.rpc('admin_overview').maybeSingle()) as { data: Overview | null; error: unknown };

  if (error || !data) return <p className="text-sm text-red-700">Could not load the overview.</p>;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">People</h2>
        <div className="grid gap-3 sm:grid-cols-4 mt-3">
          <Stat label="Creatives" value={String(data.creatives_total)} />
          <Stat label="Businesses" value={String(data.businesses_total)} />
          <Stat label="Active job posts" value={String(data.jobs_active)} />
          <Stat label="Matches, last 7 days" value={String(data.matches_last_7d)} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">New this week</h2>
        <div className="grid gap-3 sm:grid-cols-4 mt-3">
          <Stat label="New creatives" value={String(data.new_creatives_this_week)} />
          <Stat label="New businesses" value={String(data.new_businesses_this_week)} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Active subscriptions by tier</h2>
        <div className="grid gap-3 sm:grid-cols-3 mt-3">
          <Stat label="Creative Basic" value={String(data.creative_basic_active)} />
          <Stat label="Creative Premium" value={String(data.creative_premium_active)} />
          <Stat label="Business" value={String(data.business_standard_active)} />
        </div>
      </section>
    </div>
  );
}
