import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { creativeLikeBusiness } from '@/lib/actions';
import { Card, Avatar, Tag, VerifiedBadge, Rating, StatusBadge } from '@/components/ui';
import { CATEGORY_LABELS, priceRange, type CreativeCategory, type Job, type Review } from '@/lib/types';
import { ReportBlock } from '@/components/report-block';

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, creative, supabase } = await getViewer();
  if (!userId) redirect(`/login?next=/business/${id}`);

  const { data: b } = await supabase.from('business_profiles').select('*').eq('user_id', id).maybeSingle();
  if (!b) notFound();

  const [{ data: jobs }, { data: reviews }] = await Promise.all([
    supabase.from('jobs').select('*').eq('business_id', id).eq('status', 'open').order('created_at', { ascending: false }),
    supabase.from('reviews').select('*, users!reviews_reviewer_id_fkey(display_name)').eq('reviewee_id', id).order('created_at', { ascending: false }),
  ]);
  const rating = reviews?.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : null;

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="flex gap-5 items-start">
        <Avatar name={b.business_name} url={b.logo_url} size={72} />
        <div className="flex-1">
          <h1 className="font-display text-3xl flex items-center gap-2">{b.business_name} {b.is_verified && <VerifiedBadge />}</h1>
          <p className="text-sm text-muted mt-0.5">
            {b.category} · {b.neighborhood}
            {b.budget_min != null && b.budget_max != null
              ? ` · typical budget ${priceRange(b.budget_min, b.budget_max)}`
              : b.budget_band ? ` · typical budget ${b.budget_band}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Rating value={rating} count={reviews?.length || undefined} />
            {(b.brand_vibe_tags ?? []).map((t: string) => <Tag key={t}>{t}</Tag>)}
          </div>
          {b.needs_description ? (
            <p className="text-sm text-muted mt-3">Usually looking for: {b.needs_description}</p>
          ) : (b.needs as CreativeCategory[])?.length > 0 ? (
            <p className="text-sm text-muted mt-3">Usually looking for: {(b.needs as CreativeCategory[]).map(n => CATEGORY_LABELS[n]).join(', ')}</p>
          ) : null}
        </div>
      </div>

      {creative && userId !== id && (
        <Card className="p-4 mt-6 flex flex-wrap items-center gap-3">
          <form action={creativeLikeBusiness.bind(null, id)}>
            <button className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-85">♥ I&rsquo;d love to work with you</button>
          </form>
          <span className="text-xs text-muted">If they&rsquo;re interested too, a DM thread opens.</span>
        </Card>
      )}

      <h2 className="font-display text-2xl mt-10">Open jobs</h2>
      {(jobs as Job[] | null)?.length ? (
        <div className="space-y-3 mt-4">
          {(jobs as Job[]).map(j => (
            <Link key={j.id} href={`/jobs/${j.id}`} className="block">
              <Card className="p-4 flex items-center justify-between gap-3 hover:shadow-[0_8px_30px_rgba(45,42,38,0.1)] transition-shadow">
                <div>
                  <p className="font-semibold">{j.title}</p>
                  <p className="text-xs text-muted">{CATEGORY_LABELS[j.category]} · {priceRange(j.budget_min, j.budget_max) ?? 'Budget TBD'}</p>
                </div>
                <StatusBadge status={j.status} />
              </Card>
            </Link>
          ))}
        </div>
      ) : <p className="text-sm text-muted mt-3">No open jobs right now.</p>}

      <h2 className="font-display text-2xl mt-10">Reviews from creatives</h2>
      {(reviews as (Review & { users: { display_name: string | null } | null })[] | null)?.length ? (
        <div className="space-y-3 mt-4">
          {(reviews as (Review & { users: { display_name: string | null } | null })[]).map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{r.users?.display_name ?? 'A creative'}</p>
                <Rating value={r.stars} />
              </div>
              {r.body && <p className="text-sm text-muted mt-1.5">{r.body}</p>}
            </Card>
          ))}
        </div>
      ) : <p className="text-sm text-muted mt-3">No reviews yet.</p>}

      {userId !== id && <ReportBlock targetUserId={id} targetName={b.business_name} path={`/business/${id}`} />}
    </div>
  );
}
