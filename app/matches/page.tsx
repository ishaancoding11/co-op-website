import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { Card, Avatar, EmptyState, LinkButton, Tag, VerifiedBadge } from '@/components/ui';
import { LineIcon } from '@/components/line-icons';
import { displayNameFor } from '@/lib/types';

export default async function Matches() {
  const { userId, activeRole, supabase } = await getViewer();
  if (!userId) redirect('/login');

  const { data: matches } = await supabase.from('matches')
    .select('*, business_profiles(business_name, logo_url, is_verified), users:creative_id(display_name), jobs(title)')
    .eq('is_matched', true)
    .or(`business_id.eq.${userId},creative_id.eq.${userId}`)
    .order('matched_at', { ascending: false });

  const matchIds = (matches ?? []).map(m => m.id);
  const { data: lastMsgs } = matchIds.length
    ? await supabase.from('messages').select('match_id, body, created_at, sender_id, read_at').in('match_id', matchIds).order('created_at', { ascending: false })
    : { data: [] };

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl">Messages</h1>
      <p className="text-muted text-sm mt-1">Every conversation you&rsquo;ve opened with someone local. Agree on scope, then track it in Bookings.</p>
      {!matches?.length ? (
        <EmptyState
          icon={<LineIcon name="sparkle" size={30} />}
          title={activeRole === 'business' ? 'Nobody to chat with yet' : 'No conversations yet'}
          body={activeRole === 'business'
            ? 'Swipe through nearby creatives or browse the directory — when someone likes you back, your DM lands right here.'
            : 'Apply to a job you like or let a business find you — once they accept, your thread opens right here.'}
          action={<LinkButton href={activeRole === 'business' ? '/discover' : '/jobs'}>
            {activeRole === 'business' ? 'Meet local creatives' : 'Browse open jobs'}
          </LinkButton>} />
      ) : (
        <div className="space-y-3 mt-6">
          {matches.map(m => {
            const isBiz = m.business_id === userId;
            const otherName = isBiz
              ? displayNameFor((m.users as { display_name: string | null } | null)?.display_name)
              : ((m.business_profiles as { business_name: string } | null)?.business_name ?? 'Business');
            const verified = !isBiz && (m.business_profiles as { is_verified: boolean } | null)?.is_verified;
            const last = (lastMsgs ?? []).find(x => x.match_id === m.id);
            const unread = (lastMsgs ?? []).some(x => x.match_id === m.id && x.sender_id !== userId && !x.read_at);
            return (
              <Link key={m.id} href={`/messages/${m.id}`} className="block">
                <Card className={`p-4 flex items-center gap-4 hover:border-line-strong hover:shadow-[var(--shadow-md)] transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)] ${unread ? 'border-accent' : ''}`}>
                  <Avatar name={otherName} size={48} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold flex items-center gap-1.5">{otherName} {verified && <VerifiedBadge small />}</p>
                    <p className="text-xs text-muted truncate">
                      {last ? last.body : (m.jobs as { title: string } | null)?.title ? `Matched via "${(m.jobs as { title: string }).title}"` : 'Say hi'}
                    </p>
                  </div>
                  {unread && <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-label="Unread messages" />}
                  {(m.jobs as { title: string } | null)?.title && <Tag tone="sea">job</Tag>}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
