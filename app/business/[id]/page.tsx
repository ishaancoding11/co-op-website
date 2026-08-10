import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { creativeLikeBusiness } from '@/lib/actions';
import { Card, Avatar, Tag, VerifiedBadge, Rating, StatusBadge, LinkButton, NoFeeNote } from '@/components/ui';
import { categoryLabel, displayNameFor, priceRange, type CreativeCategory, type Job, type Review } from '@/lib/types';
import { getLocale } from '@/lib/i18n-server';
import { ReportBlock } from '@/components/report-block';
import { LineIcon } from '@/components/line-icons';

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, creative, supabase } = await getViewer();
  const locale = await getLocale();
  if (!userId) redirect(`/login?next=/business/${id}`);

  const { data: b } = await supabase.from('business_profiles').select('*').eq('user_id', id).maybeSingle();
  if (!b) notFound();

  const [{ data: jobs }, { data: reviews }] = await Promise.all([
    supabase.from('jobs').select('*').eq('business_id', id).eq('status', 'open').order('created_at', { ascending: false }),
    supabase.from('reviews').select('*, users!reviews_reviewer_id_fkey(display_name)').eq('reviewee_id', id).order('created_at', { ascending: false }),
  ]);
  const rating = reviews?.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : null;
  const isOwner = userId === id;
  const openJobs = (jobs ?? []) as Job[];

  return (
    <div className="py-8 max-w-3xl mx-auto">
      {/* ===== Header — same structure as the creative profile ===== */}
      <header className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">
        <div className="rounded-full p-1 bg-gradient-to-tr from-accent via-gold to-sea shrink-0">
          <div className="rounded-full p-1 bg-background">
            <Avatar name={b.business_name} url={b.logo_url} size={128} />
          </div>
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h1 className="font-display text-3xl truncate flex items-center gap-2 justify-center sm:justify-start">
              {b.business_name} {b.is_verified && <VerifiedBadge />}
            </h1>
            <div className="flex gap-2 justify-center sm:justify-start">
              {creative && !isOwner && (
                <form action={creativeLikeBusiness.bind(null, id)}>
                  <button className="press rounded-full bg-accent text-white px-5 py-2 text-sm font-medium shadow-[var(--shadow-sm)] hover:bg-accent-deep transition-colors">♥ Interested</button>
                </form>
              )}
              {isOwner && <LinkButton href="/onboarding/business" variant="ghost" size="sm">Edit profile</LinkButton>}
              {isOwner && <LinkButton href="/jobs/new" variant="secondary" size="sm">Post a job</LinkButton>}
            </div>
          </div>

          {/* stats row — mirrors the creative profile's pieces/reviews/rating row */}
          <div className="flex justify-center sm:justify-start gap-8 mt-4 text-sm">
            <span><strong className="font-semibold">{openJobs.length}</strong> <span className="text-muted">open jobs</span></span>
            <span><strong className="font-semibold">{reviews?.length ?? 0}</strong> <span className="text-muted">reviews</span></span>
            <span><Rating value={rating} /></span>
          </div>

          <div className="mt-3 space-y-1.5">
            <p className="text-sm text-muted flex items-center justify-center sm:justify-start flex-wrap gap-x-1.5 gap-y-1">
              <LineIcon name="pin" size={15} className="text-muted/80" />
              {b.neighborhood ?? 'Newport Beach'}
              {b.category ? <><span aria-hidden>·</span>{b.category}</> : null}
              {b.budget_min != null && b.budget_max != null
                ? <><span aria-hidden>·</span><LineIcon name="price" size={15} className="text-muted/80" />{priceRange(b.budget_min, b.budget_max, b.currency)}</>
                : b.budget_band ? <><span aria-hidden>·</span><LineIcon name="price" size={15} className="text-muted/80" />{b.budget_band}</> : null}
            </p>
            {b.needs_description ? (
              <p className="text-sm">{b.needs_description}</p>
            ) : (b.needs as CreativeCategory[])?.length > 0 ? (
              <p className="text-sm">Usually looking for: {(b.needs as CreativeCategory[]).map(n => categoryLabel(n, locale)).join(', ')}</p>
            ) : null}
            {(b.brand_vibe_tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start pt-1">
                {(b.brand_vibe_tags ?? []).map((t: string) => <Tag key={t}>{t}</Tag>)}
              </div>
            )}
          </div>
        </div>
      </header>

      {!creative && !isOwner && (
        <p className="text-xs text-muted text-center sm:text-left mt-4">Sign in as a creative to reach out directly.</p>
      )}

      {/* ===== Open jobs ===== */}
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="font-display text-xl">Open jobs</h2>
        {openJobs.length ? (
          <div className="space-y-3 mt-3">
            {openJobs.map(j => (
              <Link key={j.id} href={`/jobs/${j.id}`}
                className="group block rounded-3xl border border-line bg-card p-4 flex items-center justify-between gap-3
                           transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-out)]
                           hover:border-line-strong hover:shadow-[var(--shadow-md)]
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.99]">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{j.title}</p>
                  <p className="text-xs text-muted mt-0.5">{categoryLabel(j.category, locale)} <span className="text-line-strong">·</span> {priceRange(j.budget_min, j.budget_max, j.currency) ?? 'Budget TBD'}</p>
                </div>
                <StatusBadge status={j.status} />
              </Link>
            ))}
          </div>
        ) : <p className="text-sm text-muted mt-2">No open jobs right now.</p>}
      </section>

      {/* ===== Reviews — identical styling to the creative profile ===== */}
      <section className="mt-8">
        <h2 className="font-display text-xl">Reviews from creatives</h2>
        {(reviews as (Review & { users: { display_name: string | null } | null })[] | null)?.length ? (
          <div className="space-y-3 mt-3">
            {(reviews as (Review & { users: { display_name: string | null } | null })[]).map(r => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{r.users?.display_name ? displayNameFor(r.users.display_name) : 'A creative'}</p>
                  <Rating value={r.stars} />
                </div>
                {r.body && <p className="text-sm text-muted mt-1.5">{r.body}</p>}
              </Card>
            ))}
          </div>
        ) : <p className="text-sm text-muted mt-2">No reviews yet.</p>}
      </section>

      {creative && !isOwner && <div className="mt-6"><NoFeeNote /></div>}
      {userId !== id && <ReportBlock targetUserId={id} targetName={b.business_name} path={`/business/${id}`} />}
    </div>
  );
}
