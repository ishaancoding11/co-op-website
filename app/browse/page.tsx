import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Card, Tag, Avatar, EmptyState, IconPin, IconHeart, IconSearch, LinkButton } from '@/components/ui';
import { LineIcon } from '@/components/line-icons';
import { Dropdown, LocationSelect } from '@/components/dropdown';
import { PriceFilter } from '@/components/price-filter';
import { ALL_CATEGORIES, categoryLabel, displayNameFor, priceRange, type CreativeCategory } from '@/lib/types';
import { getLocale } from '@/lib/i18n-server';

export default async function Browse({ searchParams }: {
  searchParams: Promise<{ category?: string; neighborhood?: string; price_min?: string; price_max?: string; min_rating?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  const locale = await getLocale();

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
    <div className="py-8">
      <h1 className="font-display text-3xl md:text-4xl">{sp.q ? `Results for “${sp.q}”` : 'Browse local creatives'}</h1>
      <p className="text-muted text-sm mt-1.5">Photographers, designers, musicians and more — right in your neighborhood.</p>

      {/* Search + filters — prominent pill, then a quiet row of refinements */}
      <form className="mt-5" role="search" aria-label="Filter creatives">
        <div className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 shadow-[var(--shadow-sm)] focus-within:border-accent transition-colors">
          <span className="text-muted"><IconSearch size={19} /></span>
          <input name="q" defaultValue={sp.q ?? ''} placeholder="Search creatives, styles, neighborhoods…" aria-label="Search"
            className="flex-1 bg-transparent text-sm placeholder:text-muted/70 focus:outline-none" />
          <button className="press rounded-full bg-foreground text-background px-5 py-2 text-sm font-medium">Search</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <Dropdown name="category" defaultValue={sp.category ?? ''} ariaLabel="Category" className="w-44"
            leadingOptions={[{ value: '', label: 'All categories' }]}
            options={ALL_CATEGORIES.map(c => ({ value: c, label: categoryLabel(c, locale) }))} />
          <LocationSelect name="neighborhood" defaultValue={sp.neighborhood} allowAny className="w-44" ariaLabel="Location" />
          <PriceFilter nameMin="price_min" nameMax="price_max" label="Price"
            initialMin={sp.price_min ? Number(sp.price_min) : 0}
            initialMax={sp.price_max ? Number(sp.price_max) : 3000} />
          <Dropdown name="min_rating" defaultValue={sp.min_rating ?? ''} ariaLabel="Rating" className="w-36" options={[
            { value: '', label: 'Any rating' },
            { value: '4', label: '4★ & up' },
            { value: '4.5', label: '4.5★ & up' },
          ]} />
        </div>
      </form>

      {withRating.length === 0 ? (
        <EmptyState
          icon={<LineIcon name="pin" size={30} />}
          title="Nobody matches those filters — yet"
          body="Try loosening the budget, dropping a category, or picking a nearby neighborhood. New creatives join every week."
          action={<LinkButton href="/browse" variant="secondary">Clear filters</LinkButton>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-7 mt-7 stagger">
          {visible.map(c => {
            const name = displayNameFor((c.users as { display_name: string | null } | null)?.display_name);
            const rate = priceRange(c.rate_min, c.rate_max, c.currency);
            return (
              <Link key={c.user_id} href={`/creatives/${c.user_id}`} className="group press block">
                {/* Full-bleed listing image with floating price + rating, reference-style */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-sea-soft via-background to-accent-soft/60 shadow-[var(--shadow-sm)]">
                  {c.hero
                    ? <img src={c.hero} alt="" className="h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.04]" />
                    : (
                      <div className="h-full flex flex-col items-center justify-center gap-2.5">
                        <span className="grid place-items-center rounded-full bg-card ring-1 ring-line shadow-[var(--shadow-md)] p-1 transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.04]">
                          <Avatar name={name} url={c.avatar_url} size={64} />
                        </span>
                        {c.categories?.length ? (
                          <span className="text-[11px] uppercase tracking-[0.16em] text-sea/80 font-medium">{categoryLabel((c.categories as CreativeCategory[])[0], locale)}</span>
                        ) : null}
                      </div>
                    )}
                  {rate && (
                    <span className="absolute top-3 left-3 rounded-full bg-background/90 text-foreground text-xs font-semibold px-3 py-1.5 shadow-[var(--shadow-sm)] backdrop-blur">
                      {rate}
                    </span>
                  )}
                  <span className="absolute top-3 right-3 grid place-items-center h-8 w-8 rounded-full bg-background/90 text-muted shadow-[var(--shadow-sm)] backdrop-blur transition-colors group-hover:text-accent" aria-hidden>
                    <IconHeart size={16} />
                  </span>
                  {c.rating != null && (
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-foreground/85 text-background text-xs font-semibold px-2.5 py-1 backdrop-blur">
                      <span className="text-gold" aria-hidden>★</span>{c.rating.toFixed(1)}
                      {c.reviewCount ? <span className="opacity-70 font-normal">({c.reviewCount})</span> : null}
                    </span>
                  )}
                </div>
                <div className="px-1 pt-3">
                  <h2 className="font-display text-lg leading-snug truncate group-hover:text-accent transition-colors">{name}</h2>
                  <p className="text-sm text-muted mt-0.5 flex items-center gap-1.5">
                    <IconPin size={14} />{c.neighborhood ?? 'Local'}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(c.categories as CreativeCategory[]).slice(0, 3).map(x => <Tag key={x} tone="accent">{categoryLabel(x, locale)}</Tag>)}
                  </div>
                </div>
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
            <Link href="/login?role=business" className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium active:scale-[0.97] hover:opacity-90 transition-[transform,opacity] duration-200 ease-[var(--ease-out)]">Get started as a business</Link>
            <Link href="/login?role=creative" className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium active:scale-[0.97] hover:opacity-90 transition-[transform,opacity] duration-200 ease-[var(--ease-out)]">Get started as a creative</Link>
          </div>
        </Card>
      )}
    </div>
  );
}
