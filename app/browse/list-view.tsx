import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Card, Tag, Avatar, Rating, EmptyState } from '@/components/ui';
import { Dropdown, LocationSelect } from '@/components/dropdown';
import { RangeSlider } from '@/components/range-slider';
import { ALL_CATEGORIES, CATEGORY_LABELS, displayNameFor, priceRange, type CreativeCategory } from '@/lib/types';

export async function ListView({ searchParams }: {
  searchParams: { category?: string; neighborhood?: string; price_min?: string; price_max?: string; min_rating?: string; q?: string };
}) {
  const sp = searchParams;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  let q = supabase.from('creative_profiles').select('*, users(display_name)').eq('is_public', true);
  if (sp.category) q = q.contains('categories', [sp.category]);
  if (sp.neighborhood) q = q.eq('neighborhood', sp.neighborhood);
  // Price slider: keep creatives whose rate range overlaps the selected range.
  // The top handle at the cap (3000) means "no upper bound".
  if (sp.price_max && Number(sp.price_max) < 3000) q = q.lte('rate_min', Number(sp.price_max));
  if (sp.price_min && Number(sp.price_min) > 0) q = q.or(`rate_max.gte.${Number(sp.price_min)},rate_max.is.null`);
  const { data: creatives } = await q.limit(60);

  const ids = (creatives ?? []).map(c => c.user_id);
  const [{ data: reviews }, { data: portfolios }] = await Promise.all([
    ids.length ? supabase.from('reviews').select('reviewee_id, stars').in('reviewee_id', ids) : Promise.resolve({ data: [] as { reviewee_id: string; stars: number }[] }),
    ids.length ? supabase.from('portfolio_items').select('creative_id, media_url, media_type').in('creative_id', ids).eq('is_hidden', false).eq('media_type', 'image') : Promise.resolve({ data: [] as { creative_id: string; media_url: string | null; media_type: string }[] }),
  ]);

  const withRating = (creatives ?? []).map(c => {
    const rs = (reviews ?? []).filter(r => r.reviewee_id === c.user_id);
    return {
      ...c,
      rating: rs.length ? rs.reduce((s, r) => s + r.stars, 0) / rs.length : null,
      reviewCount: rs.length,
      hero: (portfolios ?? []).find(p => p.creative_id === c.user_id && p.media_url)?.media_url ?? null,
    };
  }).filter(c => !sp.min_rating || (c.rating ?? 0) >= Number(sp.min_rating))
    .filter(c => {
      if (!sp.q) return true;
      const hay = `${(c.users as { display_name: string | null } | null)?.display_name ?? ''} ${c.bio ?? ''} ${c.neighborhood ?? ''}`.toLowerCase();
      return hay.includes(sp.q.toLowerCase());
    });

  // Signed-out visitors get a limited preview
  const PREVIEW_LIMIT = 6;
  const hiddenCount = !user ? Math.max(0, withRating.length - PREVIEW_LIMIT) : 0;
  const visible = user ? withRating : withRating.slice(0, PREVIEW_LIMIT);

  return (
    <>
      <form className="mt-4 flex flex-wrap gap-2 items-end" role="search" aria-label="Filter creatives">
        <Dropdown name="category" defaultValue={sp.category ?? ''} ariaLabel="Category" className="w-44"
          leadingOptions={[{ value: '', label: 'All categories' }]}
          options={ALL_CATEGORIES.map(c => ({ value: c, label: CATEGORY_LABELS[c] }))} />
        <LocationSelect name="neighborhood" defaultValue={sp.neighborhood} allowAny className="w-44" ariaLabel="Location" />
        <div className="w-56 rounded-xl border border-line bg-card px-4 pt-2 pb-1">
          <RangeSlider nameMin="price_min" nameMax="price_max" label="price"
            initialMin={sp.price_min ? Number(sp.price_min) : 0}
            initialMax={sp.price_max ? Number(sp.price_max) : 3000} />
        </div>
        <Dropdown name="min_rating" defaultValue={sp.min_rating ?? ''} ariaLabel="Rating" className="w-36" options={[
          { value: '', label: 'Any rating' },
          { value: '4', label: '4★ & up' },
          { value: '4.5', label: '4.5★ & up' },
        ]} />
        <input type="hidden" name="view" value="list" />
        <button className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-85">Filter</button>
      </form>

      {withRating.length === 0 ? (
        <EmptyState title="No creatives match those filters" body="Try widening your budget or category." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {visible.map(c => {
            const name = displayNameFor((c.users as { display_name: string | null } | null)?.display_name);
            return (
              <Link key={c.user_id} href={`/creatives/${c.user_id}`} className="group">
                <Card className="overflow-hidden hover:shadow-[0_8px_30px_rgba(45,42,38,0.1)] transition-shadow">
                  <div className="h-40 bg-line">
                    {c.hero
                      ? <img src={c.hero} alt="" className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform" />
                      : <div className="h-full flex items-center justify-center"><Avatar name={name} url={c.avatar_url} size={64} /></div>}
                  </div>
                  <div className="p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="font-semibold truncate">{name}</h2>
                      <Rating value={c.rating} count={c.reviewCount || undefined} />
                    </div>
                    <p className="text-xs text-muted mt-0.5">{c.neighborhood} {priceRange(c.rate_min, c.rate_max) ? `· ${priceRange(c.rate_min, c.rate_max)}` : ''}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(c.categories as CreativeCategory[]).slice(0, 3).map(x => <Tag key={x} tone="accent">{CATEGORY_LABELS[x]}</Tag>)}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
      {hiddenCount > 0 && (
        <Card className="p-8 mt-6 text-center">
          <h2 className="font-display text-xl">+{hiddenCount} more local creative{hiddenCount === 1 ? '' : 's'}</h2>
          <p className="text-sm text-muted mt-1">Join free to see everyone, match, and message directly.</p>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            <Link href="/login?role=business" className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-85">Get started as a business</Link>
            <Link href="/login?role=creative" className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-85">Get started as a creative</Link>
          </div>
        </Card>
      )}
    </>
  );
}
