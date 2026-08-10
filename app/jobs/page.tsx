import Link from 'next/link';
import { getViewer } from '@/lib/auth';
import { Card, Tag, StatusBadge, VerifiedBadge, EmptyState, LinkButton } from '@/components/ui';
import { Dropdown, LocationSelect } from '@/components/dropdown';
import { SaveJobButton } from '@/components/save-job-button';
import { RangeSlider } from '@/components/range-slider';
import { ALL_CATEGORIES, CATEGORY_LABELS, priceRange, type CreativeCategory, type Job } from '@/lib/types';

const CATEGORY_ICON: Record<CreativeCategory, string> = {
  photographer: '📷', graphic_designer: '🎨', videographer: '🎬',
  brand_designer: '🏷️', muralist: '🖌️', content_creator: '📱', musician: '🎵',
};

function daysRemaining(deadline: string | null): string | null {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline + 'T00:00:00').getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return 'Deadline passed';
  if (diff === 0) return 'Due today';
  return `${diff} day${diff === 1 ? '' : 's'} left`;
}

export default async function JobFeed({ searchParams }: {
  searchParams: Promise<{ category?: string; location?: string; price_min?: string; price_max?: string; q?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const { userId, activeRole, creative, supabase } = await getViewer();

  // business_profiles is fetched separately below, not embedded here: jobs.
  // business_id is a NOT NULL FK, so PostgREST resolves that embed as an
  // inner join — if business_select's RLS hides the row (viewer and poster
  // have blocked each other), the whole job would silently vanish from the
  // feed instead of just missing its business details.
  let q = supabase.from('jobs').select('*').eq('status', 'open').order('created_at', { ascending: false });
  if (sp.category) q = q.eq('category', sp.category);
  if (sp.location) q = q.eq('location', sp.location);
  // Budget slider: keep jobs whose budget overlaps the selected range (cap = unbounded top).
  if (sp.price_min && Number(sp.price_min) > 0) q = q.or(`budget_max.gte.${Number(sp.price_min)},budget_max.is.null`);
  if (sp.price_max && Number(sp.price_max) < 3000) q = q.or(`budget_min.lte.${Number(sp.price_max)},budget_min.is.null`);
  if (sp.q) q = q.or(`title.ilike.%${sp.q}%,description.ilike.%${sp.q}%`);
  const { data: fetched } = await q.limit(50);

  // Priority placement: businesses with an active subscription rank above
  // non-subscribers (see 0008_subscriptions.sql, business_standard plan).
  const businessIds = [...new Set((fetched ?? []).map(j => j.business_id))];
  const priority = new Set<string>();
  const businesses = new Map<string, { business_name: string; neighborhood: string | null; is_verified: boolean; logo_url: string | null }>();
  if (businessIds.length) {
    const [, { data: bps }] = await Promise.all([
      Promise.all(businessIds.map(async id => {
        const { data } = await supabase.rpc('current_business_plan', { p_business: id });
        if (data) priority.add(id);
      })),
      supabase.from('business_profiles').select('user_id, business_name, neighborhood, is_verified, logo_url').in('user_id', businessIds),
    ]);
    for (const bp of bps ?? []) businesses.set(bp.user_id, bp);
  }

  // Sorting (creative-facing): price asc/desc, or "Featured" — best fit for this
  // creative's categories, location, and rate range. Priority placement always
  // wins the first tiebreak, per plan.
  const priceOf = (j: Job) => j.budget_max ?? j.budget_min ?? 0;
  const fitScore = (j: Job) => {
    if (!creative) return 0;
    let s = 0;
    if ((creative.categories ?? []).includes(j.category)) s += 3;
    if (j.location && j.location === creative.neighborhood) s += 2;
    const rateOverlap =
      (j.budget_max == null || creative.rate_min == null || j.budget_max >= creative.rate_min) &&
      (j.budget_min == null || creative.rate_max == null || j.budget_min <= creative.rate_max);
    if (rateOverlap) s += 1;
    return s;
  };
  const sort = sp.sort ?? (activeRole === 'creative' ? 'featured' : 'newest');
  const allJobs = ((fetched ?? []) as Job[]).slice().sort((a, b) => {
    const pri = Number(priority.has(b.business_id)) - Number(priority.has(a.business_id));
    if (pri !== 0) return pri;
    if (sort === 'price_asc') return priceOf(a) - priceOf(b);
    if (sort === 'price_desc') return priceOf(b) - priceOf(a);
    if (sort === 'featured') return fitScore(b) - fitScore(a) || +new Date(b.created_at) - +new Date(a.created_at);
    return +new Date(b.created_at) - +new Date(a.created_at);
  });

  // Signed-out visitors get a limited preview, same pattern as /browse.
  const JOB_PREVIEW_LIMIT = 6;
  const hiddenJobs = !userId ? Math.max(0, allJobs.length - JOB_PREVIEW_LIMIT) : 0;
  const jobs = userId ? allJobs : allJobs.slice(0, JOB_PREVIEW_LIMIT);

  let appliedIds = new Set<string>();
  let savedIds = new Set<string>();
  if (userId && activeRole === 'creative') {
    const [{ data: applied }, { data: saved }] = await Promise.all([
      supabase.from('matches').select('job_id').eq('creative_id', userId).not('job_id', 'is', null),
      supabase.from('favorites').select('saved_job_id').eq('user_id', userId).not('saved_job_id', 'is', null),
    ]);
    appliedIds = new Set((applied ?? []).map(m => m.job_id as string));
    savedIds = new Set((saved ?? []).map(f => f.saved_job_id as string));
  }

  return (
    <div className="py-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">Open jobs nearby</h1>
          <p className="text-muted text-sm mt-1">Local businesses looking for creative work right now.</p>
        </div>
        {activeRole === 'business' && <LinkButton href="/jobs/new">+ Post a job</LinkButton>}
      </div>

      <form className="mt-4 flex flex-wrap gap-2" role="search" aria-label="Filter jobs">
        <Dropdown name="category" defaultValue={sp.category ?? ''} ariaLabel="Category" className="w-44"
          leadingOptions={[{ value: '', label: 'All categories' }]}
          options={ALL_CATEGORIES.map(c => ({ value: c, label: CATEGORY_LABELS[c] }))} />
        <LocationSelect name="location" defaultValue={sp.location} allowAny className="w-44" ariaLabel="Location" />
        <div className="w-56 rounded-xl border border-line bg-card px-4 pt-2 pb-1">
          <RangeSlider nameMin="price_min" nameMax="price_max" label="budget"
            initialMin={sp.price_min ? Number(sp.price_min) : 0}
            initialMax={sp.price_max ? Number(sp.price_max) : 3000} />
        </div>
        {activeRole === 'creative' && (
          <Dropdown name="sort" defaultValue={sort} ariaLabel="Sort jobs" className="w-52" options={[
            { value: 'featured', label: 'Featured — best fit for you' },
            { value: 'price_asc', label: 'Price: low to high' },
            { value: 'price_desc', label: 'Price: high to low' },
            { value: 'newest', label: 'Newest' },
          ]} />
        )}
        <button className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-85">Filter</button>
      </form>

      {!jobs?.length ? (
        <EmptyState title="No open jobs match" body="Check back soon — or make yourself discoverable so businesses find you first." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {(jobs as Job[]).map(j => {
            const biz = businesses.get(j.business_id);
            const remaining = daysRemaining(j.deadline);
            return (
              <div key={j.id} className="relative group">
                {userId && activeRole === 'creative' && (
                  <SaveJobButton jobId={j.id} initialSaved={savedIds.has(j.id)} className="absolute top-3 right-3 z-10" />
                )}
                {priority.has(j.business_id) && (
                  <span className="absolute top-3 left-3 z-10 rounded-full bg-gold text-white text-[10px] font-semibold px-2 py-0.5 shadow">Featured</span>
                )}
                <Link href={`/jobs/${j.id}`} className="block h-full">
                  <Card className="overflow-hidden h-full flex flex-col hover:shadow-[0_8px_30px_rgba(45,42,38,0.1)] transition-shadow">
                    <div className="h-40 bg-sea-soft flex items-center justify-center relative">
                      <span className="text-5xl" aria-hidden>{CATEGORY_ICON[j.category]}</span>
                      {priceRange(j.budget_min, j.budget_max) && (
                        <span className="absolute bottom-3 left-3 rounded-lg bg-foreground/85 text-background px-2.5 py-1 text-xs font-semibold backdrop-blur">
                          {priceRange(j.budget_min, j.budget_max)}
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="font-semibold truncate group-hover:underline underline-offset-2">{j.title}</h2>
                      </div>
                      {userId ? (
                        <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                          {biz?.business_name}
                          {biz?.is_verified && <VerifiedBadge small />}
                          · {j.location ?? biz?.neighborhood}
                        </p>
                      ) : (
                        <p className="text-xs text-muted mt-0.5">{j.location ?? ''} · <span className="underline underline-offset-2">Sign in to see who&rsquo;s hiring</span></p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Tag tone="accent">{CATEGORY_LABELS[j.category]}</Tag>
                        {appliedIds.has(j.id) && <StatusBadge status="applied" />}
                      </div>
                      <p className="text-sm text-muted mt-2 line-clamp-2 flex-1">{j.description}</p>
                      {remaining && <p className="text-xs text-muted mt-2">{remaining}</p>}
                    </div>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}
      {hiddenJobs > 0 && (
        <Card className="p-8 mt-6 text-center">
          <h2 className="font-display text-xl">+{hiddenJobs} more open job{hiddenJobs === 1 ? '' : 's'}</h2>
          <p className="text-sm text-muted mt-1">Join free to see every listing, who&rsquo;s hiring, and apply with your portfolio.</p>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            <Link href="/login?role=creative" className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-85">Get started as a creative</Link>
            <Link href="/login?role=business" className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-85">Get started as a business</Link>
          </div>
        </Card>
      )}
    </div>
  );
}
