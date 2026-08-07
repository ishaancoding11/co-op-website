import { notFound } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { businessAct, toggleFavorite } from '@/lib/actions';
import { Card, Tag, Avatar, Rating, LinkButton, NoFeeNote, AvailabilityStrip } from '@/components/ui';
import { categoryLabel, displayNameFor, formatMoney, priceRange, type CreativeCategory, type MusicianDetails, type Package, type PortfolioItem, type Review } from '@/lib/types';
import { getLocale } from '@/lib/i18n-server';
import { ReportBlock } from '@/components/report-block';
import { LineIcon, mediaIcon } from '@/components/line-icons';

export default async function CreativeProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, business, supabase } = await getViewer();
  const locale = await getLocale();

  const { data: c } = await supabase.from('creative_profiles').select('*, users(display_name)').eq('user_id', id).maybeSingle();
  if (!c) notFound();
  const fullName = (c.users as { display_name: string | null } | null)?.display_name ?? 'Creative';
  // Privacy: only the owner sees their own full name; everyone else sees "First L."
  const name = userId === id ? fullName : displayNameFor(fullName);

  const [{ data: portfolio }, { data: packages }, { data: reviews }, { data: musician }, { data: fav }] = await Promise.all([
    supabase.from('portfolio_items').select('*').eq('creative_id', id).eq('is_hidden', false).order('created_at', { ascending: false }),
    supabase.from('packages').select('*').eq('creative_id', id).order('price'),
    supabase.from('reviews').select('*, users!reviews_reviewer_id_fkey(display_name)').eq('reviewee_id', id).order('created_at', { ascending: false }),
    supabase.from('musician_details').select('*').eq('creative_id', id).maybeSingle(),
    userId ? supabase.from('favorites').select('id').eq('user_id', userId).eq('saved_creative_id', id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const rating = reviews?.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : null;
  const isOwner = userId === id;
  const items = ((portfolio ?? []) as PortfolioItem[]).slice()
    .sort((a, b) => Number(b.is_favorite ?? false) - Number(a.is_favorite ?? false));

  return (
    <div className="py-8 max-w-3xl mx-auto">
      {/* ===== IG-style header ===== */}
      <header className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">
        <div className="rounded-full p-1 bg-gradient-to-tr from-accent via-gold to-sea shrink-0">
          <div className="rounded-full p-1 bg-background">
            <Avatar name={name} url={c.avatar_url} size={128} />
          </div>
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="font-display text-3xl truncate">{name}</h1>
            <div className="flex gap-2 justify-center sm:justify-start">
              {business && !isOwner && (
                <>
                  <form action={async () => { 'use server'; await businessAct(id, 'liked', 'direct'); }}>
                    <button className="rounded-full bg-accent text-white px-5 py-2 text-sm font-medium hover:opacity-85">♥ Interested</button>
                  </form>
                  <form action={toggleFavorite.bind(null, 'creative', id, `/creatives/${id}`)}>
                    <button className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:bg-card">{fav ? '♥ Saved' : '♡ Save'}</button>
                  </form>
                </>
              )}
              {isOwner && <LinkButton href="/onboarding/creative" variant="ghost" size="sm">Edit profile</LinkButton>}
              {isOwner && <LinkButton href="/portfolio" variant="secondary" size="sm">Manage portfolio</LinkButton>}
              {!userId && <LinkButton href={`/login?role=business&next=/creatives/${id}`} size="sm">Sign in to connect</LinkButton>}
            </div>
          </div>

          {/* stats row */}
          <div className="flex justify-center sm:justify-start gap-8 mt-4 text-sm">
            <span><strong className="font-semibold">{items.length}</strong> <span className="text-muted">pieces</span></span>
            <span><strong className="font-semibold">{reviews?.length ?? 0}</strong> <span className="text-muted">reviews</span></span>
            <span><Rating value={rating} /></span>
          </div>

          <div className="mt-3 space-y-1.5">
            {c.bio && <p className="text-sm">{c.bio}</p>}
            <p className="text-sm text-muted flex items-center justify-center sm:justify-start flex-wrap gap-x-1.5 gap-y-1">
              <LineIcon name="pin" size={15} className="text-muted/80" />
              {c.neighborhood ?? 'Newport Beach'}
              {priceRange(c.rate_min, c.rate_max, c.currency) ? <><span aria-hidden>·</span><LineIcon name="price" size={15} className="text-muted/80" />{priceRange(c.rate_min, c.rate_max, c.currency)}</> : null}
              {c.availability ? <><span aria-hidden>·</span>{c.availability}</> : null}
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start pt-1">
              {(c.categories as CreativeCategory[]).map(x => <Tag key={x} tone="accent">{categoryLabel(x, locale)}</Tag>)}
            </div>
            {(c.available_days as string[] | null)?.length ? (
              <div className="pt-1.5 flex justify-center sm:justify-start"><AvailabilityStrip days={c.available_days as string[]} /></div>
            ) : null}
          </div>
        </div>
      </header>

      {/* ===== Packages strip (compact) ===== */}
      {(packages as Package[] | null)?.length ? (
        <section className="mt-8">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {(packages as Package[]).map(p => (
              <Card key={p.id} className="p-4 min-w-52 shrink-0">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-wider text-accent font-semibold">{p.tier}</p>
                  <p className="font-display text-lg">{formatMoney(p.price, c.currency)}</p>
                </div>
                <p className="text-sm font-medium">{p.title}</p>
                <p className="text-xs text-muted mt-0.5">{p.deliverables.slice(0, 2).join(' · ')}{p.turnaround_days ? ` · ${p.turnaround_days}d` : ''}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* ===== IG-style photo grid ===== */}
      <section className="mt-8 border-t border-line pt-2">
        <p className="text-center text-[11px] uppercase tracking-[0.2em] font-semibold text-muted py-2">⊞ Portfolio</p>
        {items.length ? (
          <div className="grid grid-cols-3 gap-1">
            {items.map(p => (
              <div key={p.id} className="relative aspect-square bg-sea-soft overflow-hidden group">
                {p.is_favorite && <span className="absolute top-1.5 right-1.5 z-10 text-gold drop-shadow" title="Highlighted" aria-label="Highlighted piece">★</span>}
                {p.media_type === 'image' && p.media_url ? (
                  <img src={p.media_url} alt={p.caption ?? `Work by ${name}`} className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform" />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-1 px-2 text-center text-sea/70">
                    <LineIcon name={mediaIcon(p.media_type, p.source)} size={26} />
                    <span className="text-[10px] text-muted line-clamp-2">{p.caption ?? ''}</span>
                  </div>
                )}
                {p.media_type === 'image' && p.caption && (
                  <span className="absolute inset-x-0 bottom-0 bg-foreground/60 text-background text-[10px] px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity truncate">{p.caption}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted py-12">No pieces yet</p>
        )}
      </section>

      {/* ===== Musician venues ===== */}
      {musician && (
        <section className="mt-8">
          <h2 className="font-display text-xl">Venues & sets</h2>
          <Card className="p-5 mt-3">
            <ul className="space-y-1.5 text-sm">
              {(musician as MusicianDetails).venues.map((v, i) => <li key={i} className="flex items-center gap-2"><LineIcon name="mic" size={16} className="text-sea shrink-0" /><span className="font-medium">{v.name}</span>{v.event ? <span className="text-muted"> — {v.event}</span> : null}</li>)}
            </ul>
            {(musician as MusicianDetails).audio_links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(musician as MusicianDetails).audio_links.map(l => <a key={l} href={l} target="_blank" rel="noopener noreferrer" className="text-sm text-sea underline underline-offset-2">Listen ↗</a>)}
              </div>
            )}
            {((musician as MusicianDetails).rate_per_set_min || (musician as MusicianDetails).rate_per_set_max) && (
              <p className="text-sm text-muted mt-3">Rate per set: {priceRange((musician as MusicianDetails).rate_per_set_min, (musician as MusicianDetails).rate_per_set_max, c.currency)}</p>
            )}
          </Card>
        </section>
      )}

      {/* ===== Reviews ===== */}
      <section className="mt-8">
        <h2 className="font-display text-xl">Reviews</h2>
        {(reviews as (Review & { users: { display_name: string | null } | null })[] | null)?.length ? (
          <div className="space-y-3 mt-3">
            {(reviews as (Review & { users: { display_name: string | null } | null })[]).map(r => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{r.users?.display_name ?? 'A local business'}</p>
                  <Rating value={r.stars} />
                </div>
                {r.body && <p className="text-sm text-muted mt-1.5">{r.body}</p>}
              </Card>
            ))}
          </div>
        ) : <p className="text-sm text-muted mt-2">No reviews yet — be the first to work with {name}.</p>}
      </section>

      {business && !isOwner && <div className="mt-6"><NoFeeNote /></div>}
      {userId && !isOwner && <ReportBlock targetUserId={id} targetName={name} path={`/creatives/${id}`} />}
    </div>
  );
}
