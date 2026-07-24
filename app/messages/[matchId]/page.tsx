import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { VerifiedBadge, LinkButton } from '@/components/ui';
import { Thread } from './thread';

export default async function MessagePage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const { userId, supabase } = await getViewer();
  if (!userId) redirect('/login');

  const { data: m } = await supabase.from('matches')
    .select('*, business_profiles(business_name, is_verified), users:creative_id(display_name), jobs(title)')
    .eq('id', matchId).maybeSingle();
  if (!m || !m.is_matched) notFound();

  const isBiz = m.business_id === userId;
  const otherId = isBiz ? m.creative_id : m.business_id;
  const otherName = isBiz
    ? ((m.users as { display_name: string | null } | null)?.display_name ?? 'Creative')
    : ((m.business_profiles as { business_name: string } | null)?.business_name ?? 'Business');
  const verified = !isBiz && (m.business_profiles as { is_verified: boolean } | null)?.is_verified;

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
          {(m.jobs as { title: string } | null)?.title && <p className="text-xs text-muted">Job: {(m.jobs as { title: string }).title}</p>}
        </div>
        {agreement
          ? <LinkButton href={`/agreements/${agreement.id}`} size="sm" variant="secondary">Agreement · {agreement.status.replace(/_/g, ' ')}</LinkButton>
          : <LinkButton href={`/agreements/new?match=${matchId}`} size="sm">Work together</LinkButton>}
      </div>
      <Thread matchId={matchId} userId={userId} initial={messages ?? []} otherName={otherName} />
    </div>
  );
}
