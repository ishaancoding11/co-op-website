import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { markComplete, updateAgreementStatus } from '@/lib/actions';
import { Card, StatusBadge, NoFeeNote, LinkButton } from '@/components/ui';
import { ReviewForm } from './review-form';
import { displayNameFor, formatMoney, type Review } from '@/lib/types';

export default async function AgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, supabase } = await getViewer();
  if (!userId) redirect('/login');

  const { data: a } = await supabase.from('agreements')
    .select('*, business_profiles(business_name), users:creative_id(display_name), jobs(title)')
    .eq('id', id).maybeSingle();
  if (!a) notFound();

  const isBiz = a.business_id === userId;
  const otherId = isBiz ? a.creative_id : a.business_id;
  const otherName = isBiz
    ? displayNameFor((a.users as { display_name: string | null } | null)?.display_name)
    : ((a.business_profiles as { business_name: string } | null)?.business_name ?? 'Business');
  const iCompleted = isBiz ? !!a.completed_by_business_at : !!a.completed_by_creative_at;
  const theyCompleted = isBiz ? !!a.completed_by_creative_at : !!a.completed_by_business_at;

  const { data: reviews } = await supabase.from('reviews').select('*').eq('agreement_id', id);
  const myReview = (reviews as Review[] | null)?.find(r => r.reviewer_id === userId);

  return (
    <div className="py-8 max-w-xl mx-auto">
      <p className="text-sm text-muted"><Link href={`/messages/${a.match_id}`} className="underline underline-offset-2">← Back to messages</Link></p>
      <div className="flex items-center justify-between gap-3 mt-2">
        <h1 className="font-display text-3xl">Agreement with {otherName}</h1>
        <StatusBadge status={a.status} />
      </div>

      <Card className="p-6 mt-5 space-y-3">
        {(a.jobs as { title: string } | null)?.title && <p className="text-sm"><span className="text-muted">Job:</span> {(a.jobs as { title: string }).title}</p>}
        <p className="text-sm whitespace-pre-wrap"><span className="text-muted">Scope:</span> {a.scope ?? '—'}</p>
        <p className="text-sm"><span className="text-muted">Agreed price:</span> {a.agreed_price != null ? formatMoney(a.agreed_price, a.currency) : 'TBD'}</p>
        <NoFeeNote />
      </Card>

      {a.status === 'requested' && (
        <Card className="p-5 mt-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted">Waiting on acceptance to kick things off.</p>
          <div className="flex gap-2">
            <form action={updateAgreementStatus.bind(null, id, 'accepted')}>
              <button className="rounded-full bg-accent text-white px-5 py-2 text-sm font-medium hover:opacity-85">Accept</button>
            </form>
            <form action={updateAgreementStatus.bind(null, id, 'cancelled')}>
              <button className="rounded-full border border-line px-5 py-2 text-sm text-muted font-medium hover:bg-background">Cancel</button>
            </form>
          </div>
        </Card>
      )}

      {(a.status === 'accepted' || a.status === 'in_progress') && (
        <Card className="p-5 mt-4">
          <h2 className="font-semibold text-sm">Completion</h2>
          <p className="text-xs text-muted mt-1">The project completes when <em>both</em> of you mark it done.</p>
          <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
            <div className={`rounded-xl border px-4 py-3 ${iCompleted ? 'border-sea bg-sea-soft text-sea' : 'border-line'}`}>You {iCompleted ? '✓ marked complete' : '· not yet'}</div>
            <div className={`rounded-xl border px-4 py-3 ${theyCompleted ? 'border-sea bg-sea-soft text-sea' : 'border-line'}`}>{otherName} {theyCompleted ? '✓ marked complete' : '· not yet'}</div>
          </div>
          {!iCompleted && (
            <form action={markComplete.bind(null, id)} className="mt-4">
              <button className="w-full rounded-full bg-foreground text-background py-2.5 text-sm font-medium hover:opacity-85">Mark complete</button>
            </form>
          )}
        </Card>
      )}

      {a.status === 'completed' && (
        <Card className="p-5 mt-4">
          <p className="text-sm text-sea font-medium">✓ Completed — {isBiz ? 'this project was added to the creative’s portfolio.' : 'this project was added to your portfolio (you can hide it anytime).'}</p>
          <h2 className="font-display text-2xl mt-4">Leave a review</h2>
          {myReview
            ? <p className="text-sm text-muted mt-2">You rated {otherName} {myReview.stars}★{myReview.body ? ` — “${myReview.body}”` : ''}</p>
            : <ReviewForm agreementId={id} revieweeId={otherId} revieweeName={otherName} />}
          {!isBiz && <div className="mt-4"><LinkButton href="/portfolio" variant="ghost" size="sm">Manage portfolio</LinkButton></div>}
        </Card>
      )}
    </div>
  );
}
