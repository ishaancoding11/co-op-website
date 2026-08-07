import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { Card, Avatar, EmptyState, Tag, StatusBadge } from '@/components/ui';
import { categoryLabel, displayNameFor, priceRange, type CreativeCategory, type Currency } from '@/lib/types';
import { getLocale } from '@/lib/i18n-server';

export default async function Favorites() {
  const { userId, supabase } = await getViewer();
  if (!userId) redirect('/login');
  const locale = await getLocale();

  const { data: favs } = await supabase.from('favorites')
    .select('*, creative_profiles(neighborhood, categories, avatar_url, rate_min, rate_max, currency, users(display_name)), jobs(title, category, status, budget_min, budget_max, currency)')
    .eq('user_id', userId).order('created_at', { ascending: false });

  const creatives = (favs ?? []).filter(f => f.saved_creative_id);
  const jobs = (favs ?? []).filter(f => f.saved_job_id);

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl">Saved</h1>
      {!favs?.length ? (
        <EmptyState title="Nothing saved yet" body="Tap ♡ on a creative or job to keep it here for later." />
      ) : (
        <>
          {creatives.length > 0 && <>
            <h2 className="font-semibold mt-6 mb-3">Creatives</h2>
            <div className="space-y-3">
              {creatives.map(f => {
                const cp = f.creative_profiles as { neighborhood: string | null; categories: CreativeCategory[]; avatar_url: string | null; rate_min: number | null; rate_max: number | null; currency: Currency | null; users: { display_name: string | null } | null } | null;
                const name = displayNameFor(cp?.users?.display_name);
                return (
                  <Link key={f.id} href={`/creatives/${f.saved_creative_id}`} className="block">
                    <Card className="p-4 flex items-center gap-4 hover:shadow-[0_8px_30px_rgba(45,42,38,0.1)] transition-shadow">
                      <Avatar name={name} url={cp?.avatar_url} size={44} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{name}</p>
                        <p className="text-xs text-muted">{cp?.neighborhood} · {priceRange(cp?.rate_min ?? null, cp?.rate_max ?? null, cp?.currency ?? undefined) ?? ''}</p>
                      </div>
                      {(cp?.categories ?? []).slice(0, 2).map(c => <Tag key={c} tone="accent">{categoryLabel(c, locale)}</Tag>)}
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>}
          {jobs.length > 0 && <>
            <h2 className="font-semibold mt-8 mb-3">Jobs</h2>
            <div className="space-y-3">
              {jobs.map(f => {
                const j = f.jobs as { title: string; category: CreativeCategory; status: string; budget_min: number | null; budget_max: number | null; currency: Currency | null } | null;
                return (
                  <Link key={f.id} href={`/jobs/${f.saved_job_id}`} className="block">
                    <Card className="p-4 flex items-center justify-between gap-3 hover:shadow-[0_8px_30px_rgba(45,42,38,0.1)] transition-shadow">
                      <div>
                        <p className="font-semibold">{j?.title}</p>
                        <p className="text-xs text-muted">{j ? categoryLabel(j.category, locale) : ''} · {priceRange(j?.budget_min ?? null, j?.budget_max ?? null, j?.currency ?? undefined) ?? 'Budget TBD'}</p>
                      </div>
                      <StatusBadge status={j?.status ?? 'open'} />
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>}
        </>
      )}
    </div>
  );
}
