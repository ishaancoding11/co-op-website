import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { Card, Avatar, EmptyState, LinkButton, Tag, VerifiedBadge } from '@/components/ui';
import { displayNameFor } from '@/lib/types';

export default async function Matches() {
  const { userId, activeRole, supabase } = await getViewer();
  if (!userId) redirect('/login');

  // business_profiles is fetched separately below, not embedded: matches.
  // business_id is a NOT NULL FK, so an embed resolves as an inner join —
  // any match with a business the creative has blocked (or been blocked by)
  // would silently vanish from this whole list instead of just showing a
  // blank name. jobs(title) stays embedded: matches.job_id is nullable, so
  // that embed is always a safe left join regardless of RLS.
  const { data: matches } = await supabase.from('matches')
    .select('*, users:creative_id(display_name), jobs(title)')
    .eq('is_matched', true)
    .or(`business_id.eq.${userId},creative_id.eq.${userId}`)
    .order('matched_at', { ascending: false });

  const matchIds = (matches ?? []).map(m => m.id);
  const businessIds = [...new Set((matches ?? []).map(m => m.business_id))];
  const [{ data: lastMsgs }, { data: bizRows }] = await Promise.all([
    matchIds.length
      ? supabase.from('messages').select('match_id, body, created_at, sender_id, read_at').in('match_id', matchIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    businessIds.length
      ? supabase.from('business_profiles').select('user_id, business_name, logo_url, is_verified').in('user_id', businessIds)
      : Promise.resolve({ data: [] }),
  ]);
  const businesses = new Map((bizRows ?? []).map(b => [b.user_id, b]));

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl">Matches</h1>
      <p className="text-muted text-sm mt-1">Mutual interest — DMs are open. Agree on scope, then track it in Bookings.</p>
      {!matches?.length ? (
        <EmptyState title="No matches yet"
          body={activeRole === 'business' ? 'Swipe through nearby creatives — when interest is mutual, you land here.' : 'Apply to jobs or get discovered — when a business accepts, you land here.'}
          action={<LinkButton href={activeRole === 'business' ? '/discover' : '/jobs'}>{activeRole === 'business' ? 'Discover creatives' : 'Browse jobs'}</LinkButton>} />
      ) : (
        <div className="space-y-3 mt-6">
          {matches.map(m => {
            const isBiz = m.business_id === userId;
            const biz = businesses.get(m.business_id);
            const otherName = isBiz
              ? displayNameFor((m.users as { display_name: string | null } | null)?.display_name)
              : (biz?.business_name ?? 'Business');
            const verified = !isBiz && !!biz?.is_verified;
            const last = (lastMsgs ?? []).find(x => x.match_id === m.id);
            const unread = (lastMsgs ?? []).some(x => x.match_id === m.id && x.sender_id !== userId && !x.read_at);
            return (
              <Link key={m.id} href={`/messages/${m.id}`} className="block">
                <Card className={`p-4 flex items-center gap-4 hover:shadow-[0_8px_30px_rgba(45,42,38,0.1)] transition-shadow ${unread ? 'border-accent' : ''}`}>
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
