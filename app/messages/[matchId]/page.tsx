import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { VerifiedBadge, LinkButton } from '@/components/ui';
import { displayNameFor } from '@/lib/types';
import { Thread } from './thread';

export default async function MessagePage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const { userId, supabase } = await getViewer();
  if (!userId) redirect('/login');

  // No embeds at all on this query — deliberately. business_profiles was
  // dropped (matches.business_id is a NOT NULL FK; an embed there resolves
  // as an inner join, and business_select's RLS hiding that row over a
  // block would 404 the whole thread). users:creative_id(display_name) is
  // also dropped: confirmed via the applicants page that this exact embed
  // can silently empty a matches query even when RLS on the base table
  // itself would allow the row through, for reasons independent of RLS
  // strictness. jobs(title) was dropped too even though matches.job_id is
  // nullable (safe on its own) — no embeds at all here until there's a
  // reason to trust any of them again. `error` is logged instead of
  // silently discarded, so a real query failure doesn't read as "not
  // found" with no way to tell the two apart.
  const { data: m, error: matchError } = await supabase.from('matches').select('*').eq('id', matchId).maybeSingle();
  if (matchError) console.error('[messages] match query failed:', matchError.message);
  if (!m || !m.is_matched) notFound();

  const isBiz = m.business_id === userId;
  const otherId = isBiz ? m.creative_id : m.business_id;
  let otherName = 'Business';
  let verified = false;
  let jobTitle: string | null = null;
  if (isBiz) {
    const { data: u } = await supabase.from('users').select('display_name').eq('id', m.creative_id).maybeSingle();
    otherName = displayNameFor(u?.display_name);
  } else {
    const { data: biz } = await supabase.from('business_profiles').select('business_name, is_verified').eq('user_id', m.business_id).maybeSingle();
    otherName = biz?.business_name ?? 'Business';
    verified = biz?.is_verified ?? false;
  }
  if (m.job_id) {
    const { data: job } = await supabase.from('jobs').select('title').eq('id', m.job_id).maybeSingle();
    jobTitle = job?.title ?? null;
  }

  const { data: messages } = await supabase.from('messages').select('*').eq('match_id', matchId).order('created_at').limit(200);
  const { data: agreement } = await supabase.from('agreements').select('id, status').eq('match_id', matchId).order('created_at', { ascending: false }).limit(1).maybeSingle();

  // mark incoming as read
  await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('match_id', matchId).neq('sender_id', userId).is('read_at', null);

  return (
    <div className="py-6 max-w-2xl mx-auto flex flex-col" style={{ minHeight: 'calc(100dvh - 3.5rem)' }}>
      <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="font-semibold flex items-center gap-1.5">
            <Link href={isBiz ? `/creatives/${otherId}` : `/business/${otherId}`} className="hover:underline underline-offset-2">{otherName}</Link>
            {verified && <VerifiedBadge small />}
          </p>
          {jobTitle && <p className="text-xs text-muted">Job: {jobTitle}</p>}
        </div>
        {agreement
          ? <LinkButton href={`/agreements/${agreement.id}`} size="sm" variant="secondary">Agreement · {agreement.status.replace(/_/g, ' ')}</LinkButton>
          : <LinkButton href={`/agreements/new?match=${matchId}`} size="sm">Work together</LinkButton>}
      </div>
      <Thread matchId={matchId} userId={userId} initial={messages ?? []} otherName={otherName} />
    </div>
  );
}
