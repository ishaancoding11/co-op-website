import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { creativePassJob, setJobStatus, toggleFavorite } from '@/lib/actions';
import { Card, Tag, StatusBadge, VerifiedBadge, LinkButton, NoFeeNote } from '@/components/ui';
import { CATEGORY_LABELS, priceRange, type PortfolioItem } from '@/lib/types';
import { ApplyForm } from './apply-form';

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, creative, activeRole, supabase } = await getViewer();

  const { data: j } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle();
  if (!j) notFound();
  // business_profiles fetched separately, not embedded: jobs.business_id is
  // a NOT NULL FK, so an embed here resolves as an inner join — if the
  // viewer and the poster have blocked each other, business_select's RLS
  // would hide that row and the embed would 404 the whole job page instead
  // of just missing the business's name/badge.
  const { data: bizRow } = await supabase.from('business_profiles')
    .select('business_name, neighborhood, is_verified').eq('user_id', j.business_id).maybeSingle();
  const biz = bizRow ?? { business_name: 'A local business', neighborhood: null, is_verified: false };
  const isOwner = userId === j.business_id;

  let myMatch = null;
  let myPortfolio: PortfolioItem[] = [];
  if (userId && creative) {
    const [{ data: m }, { data: pf }] = await Promise.all([
      supabase.from('matches').select('*').eq('creative_id', userId).eq('job_id', id).maybeSingle(),
      supabase.from('portfolio_items').select('*').eq('creative_id', userId).eq('is_hidden', false).order('created_at', { ascending: false }),
    ]);
    myMatch = m;
    myPortfolio = ((pf ?? []) as PortfolioItem[]).slice().sort((a, b) => Number(b.is_favorite ?? false) - Number(a.is_favorite ?? false));
  }
  const { data: fav } = userId
    ? await supabase.from('favorites').select('id').eq('user_id', userId).eq('saved_job_id', id).maybeSingle()
    : { data: null };

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl">{j.title}</h1>
          <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
            <Link href={`/business/${j.business_id}`} className="underline underline-offset-2">{biz.business_name}</Link>
            {biz.is_verified && <VerifiedBadge small />} · {j.location ?? biz.neighborhood}
          </p>
        </div>
        <StatusBadge status={j.status} />
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Tag tone="accent">{CATEGORY_LABELS[j.category as keyof typeof CATEGORY_LABELS]}</Tag>
        {priceRange(j.budget_min, j.budget_max) && <Tag tone="sea">{priceRange(j.budget_min, j.budget_max)}</Tag>}
        {j.deadline && <Tag>Due {new Date(j.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Tag>}
      </div>

      <Card className="p-6 mt-6">
        <p className="text-sm whitespace-pre-wrap">{j.description}</p>
      </Card>

      {isOwner && (
        <Card className="p-4 mt-4 flex items-center justify-between gap-3 flex-wrap">
          <LinkButton href={`/jobs/${id}/applicants`} variant="secondary">View applicants</LinkButton>
          {j.status === 'open' && (
            <form action={setJobStatus.bind(null, id, 'closed')}>
              <button className="text-sm text-muted underline underline-offset-2 hover:text-foreground">Close this job</button>
            </form>
          )}
        </Card>
      )}

      {activeRole === 'creative' && creative && !isOwner && j.status === 'open' && (
        <div className="mt-6">
          {myMatch?.creative_action === 'liked' ? (
            <Card className="p-6 text-center">
              <StatusBadge status={myMatch.application_status ?? 'applied'} />
              <p className="text-sm text-muted mt-2">
                {myMatch.application_status === 'accepted'
                  ? 'You were accepted — your DM thread is open!'
                  : 'Application sent. You’ll hear back here and by email.'}
              </p>
              {myMatch.is_matched && <div className="mt-3"><LinkButton href={`/messages/${myMatch.id}`} size="sm">Open messages</LinkButton></div>}
            </Card>
          ) : (
            <>
              <h2 className="font-display text-2xl mb-3">Apply</h2>
              <Card className="p-6">
                <ApplyForm jobId={id} businessId={j.business_id} portfolio={myPortfolio} />
              </Card>
              <div className="flex gap-4 mt-3 items-center">
                <form action={creativePassJob.bind(null, id, j.business_id)}>
                  <button className="text-sm text-muted underline underline-offset-2 hover:text-foreground">Not for me — pass</button>
                </form>
                <form action={toggleFavorite.bind(null, 'job', id, `/jobs/${id}`)}>
                  <button className="text-sm text-muted underline underline-offset-2 hover:text-foreground">{fav ? '♥ Saved' : '♡ Save for later'}</button>
                </form>
              </div>
            </>
          )}
          <div className="mt-4"><NoFeeNote /></div>
        </div>
      )}

      {!userId && (
        <Card className="p-4 mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">Interested in this job?</p>
          <LinkButton href={`/login?role=creative&next=/jobs/${id}`} size="sm">Sign in to apply</LinkButton>
        </Card>
      )}
    </div>
  );
}
