import Link from 'next/link';
import { getViewer } from '@/lib/auth';
import { Card, Tag, StatusBadge, VerifiedBadge, EmptyState, LinkButton, inputCls, LocationSelect } from '@/components/ui';
import { SaveJobButton } from '@/components/save-job-button';
import { RangeSlider } from '@/components/range-slider';
import { ALL_CATEGORIES, CATEGORY_LABELS, priceRange, type Job } from '@/lib/types';

export default async function JobFeed({ searchParams }: {
  searchParams: Promise<{ category?: string; location?: string; price_min?: string; price_max?: string; q?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const { userId, activeRole, creative, supabase } = await getViewer();

  let q = supabase.from('jobs').select('*, business_profiles(business_name, neighborhood, is_verified, logo_url)').eq('status', 'open').order('created_at', { ascending: false });
  if (sp.category) q = q.eq('category', sp.category);
  if (sp.location) q = q.eq('location', sp.location);
  // Budget slider: keep jobs whose budget overlaps the selected range (cap = unbounded top).
  if (sp.price_min && Number(sp.price_min) > 0) q = q.or(`budget_max.gte.${Number(sp.price_min)},budget_max.is.null`);
  if (sp.price_max && Number(sp.price_max) < 3000) q = q.or(`budget_min.lte.${Number(sp.price_max)},budget_min.is.null`);
  if (sp.q) q = q.or(`title.ilike.%${sp.q}%,description.ilike.%${sp.q}%`);
  const { data: fetched } = await q.limit(50);

  // Sorting (creative-facing): price asc/desc, or "Featured" — best fit for this
  // creative's categories, location, and rate range.
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
    if (sort === 'price_asc') return priceOf(a) - priceOf(b);
    if (sort === 'price_desc') return priceOf(b) - priceOf(a);
    if (sort === 'featured') return fitScore(b) - fitScore(a) || +new Date(b.created_at) - +new Date(a.created_at);
    return +new Date(b.created_at) - +new Date(a.created_at);
  });

  // Signed-out visitors get a limited preview
  const JOB_PREVIEW_LIMIT = 4;
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
        <select name="category" defaultValue={sp.category ?? ''} className={`${inputCls} !w-auto`} aria-label="Category">
          <option value="">All categories</option>
          {ALL_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <LocationSelect name="location" defaultValue={sp.location} allowAny className="!w-auto" ariaLabel="Location" />
        <div className="w-56 rounded-xl border border-line bg-card px-4 pt-2 pb-1">
          <RangeSlider nameMin="price_min" nameMax="price_max" label="budget"
            initialMin={sp.price_min ? Number(sp.price_min) : 0}
            initialMax={sp.price_max ? Number(sp.price_max) : 3000} />
        </div>
        {activeRole === 'creative' && (
          <select name="sort" defaultValue={sort} className={`${inputCls} !w-auto`} aria-label="Sort jobs">
            <option value="featured">Featured — best fit for you</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="newest">Newest</option>
          </select>
        )}
        <button className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-85">Filter</button>
      </form>

      {!jobs?.length ? (
        <EmptyState title="No open jobs match" body="Check back soon — or make yourself discoverable so businesses find you first." />
      ) : (
        <div className="space-y-3 mt-6">
          {(jobs as (Job & { business_profiles: { business_name: string; neighborhood: string | null; is_verified: boolean } | null })[]).map(j => (
            <div key={j.id} className="relative">
              {userId && activeRole === 'creative' && (
                <SaveJobButton jobId={j.id} initialSaved={savedIds.has(j.id)} className="absolute bottom-4 right-4 z-10" />
              )}
              <Link href={`/jobs/${j.id}`} className="block group">
              <Card className="p-5 hover:shadow-[0_8px_30px_rgba(45,42,38,0.1)] transition-shadow">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-semibold group-hover:underline underline-offset-2">{j.title}</h2>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                      {j.business_profiles?.business_name}
                      {j.business_profiles?.is_verified && <VerifiedBadge small />}
                      · {j.location ?? j.business_profiles?.neighborhood}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {appliedIds.has(j.id) && <StatusBadge status="applied" />}
                    {priceRange(j.budget_min, j.budget_max) && <Tag tone="sea">{priceRange(j.budget_min, j.budget_max)}</Tag>}
                    <Tag tone="accent">{CATEGORY_LABELS[j.category]}</Tag>
                  </div>
                </div>
                <p className="text-sm text-muted mt-2 line-clamp-2">{j.description}</p>
                {j.deadline && <p className="text-xs text-muted mt-2">Due {new Date(j.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>}
              </Card>
              </Link>
            </div>
          ))}
        </div>
      )}
      {hiddenJobs > 0 && (
        <Card className="p-8 mt-6 text-center">
          <h2 className="font-display text-xl">+{hiddenJobs} more open job{hiddenJobs === 1 ? '' : 's'}</h2>
          <p className="text-sm text-muted mt-1">Join free to see every listing and apply with your portfolio.</p>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            <Link href="/login?role=creative" className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-85">Get started as a creative</Link>
            <Link href="/login?role=business" className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-85">Get started as a business</Link>
          </div>
        </Card>
      )}
    </div>
  );
}
