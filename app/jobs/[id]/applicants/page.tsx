import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { setApplicationStatus } from '@/lib/actions';
import { Card, Avatar, StatusBadge, Rating, EmptyState, LinkButton, Tag } from '@/components/ui';
import { CATEGORY_LABELS, displayNameFor, type CreativeCategory } from '@/lib/types';

export default async function Applicants({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, supabase } = await getViewer();
  if (!userId) redirect('/login?role=business');

  const { data: job } = await supabase.from('jobs').select('*').eq('id', id).eq('business_id', userId).maybeSingle();
  if (!job) notFound();

  const { data: apps } = await supabase.from('matches')
    .select('*, creative_profiles(neighborhood, categories, avatar_url, rate_min, rate_max), users:creative_id(display_name)')
    .eq('job_id', id).eq('creative_action', 'liked')
    .order('created_at', { ascending: false });

  const creativeIds = (apps ?? []).map(a => a.creative_id);
  const attachedIds = (apps ?? []).flatMap(a => (a.pitch_portfolio_ids as string[] | null) ?? []);
  const [{ data: reviews }, { data: attachedItems }] = await Promise.all([
    creativeIds.length ? supabase.from('reviews').select('reviewee_id, stars').in('reviewee_id', creativeIds) : Promise.resolve({ data: [] }),
    attachedIds.length ? supabase.from('portfolio_items').select('id, media_url, media_type, caption').in('id', attachedIds) : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <p className="text-sm text-muted"><Link href={`/jobs/${id}`} className="underline underline-offset-2">← {job.title}</Link></p>
      <h1 className="font-display text-3xl mt-2">Applicants</h1>
      <p className="text-muted text-sm mt-1">Compare, shortlist, and accept. Accepting opens a DM thread.</p>

      {!apps?.length ? (
        <EmptyState title="No applications yet" body="Creatives see your job in their feed. You can also go find them yourself."
          action={<LinkButton href="/discover" variant="ghost">Discover creatives</LinkButton>} />
      ) : (
        <div className="space-y-3 mt-6">
          {apps.map(a => {
            const cp = a.creative_profiles as { neighborhood: string | null; categories: CreativeCategory[]; avatar_url: string | null } | null;
            const name = displayNameFor((a.users as { display_name: string | null } | null)?.display_name);
            const rs = (reviews ?? []).filter(r => r.reviewee_id === a.creative_id);
            const rating = rs.length ? rs.reduce((s, r) => s + r.stars, 0) / rs.length : null;
            return (
              <Card key={a.id} className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar name={name} url={cp?.avatar_url} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Link href={`/creatives/${a.creative_id}`} className="font-semibold hover:underline underline-offset-2">{name}</Link>
                      <div className="flex items-center gap-2">
                        <Rating value={rating} count={rs.length || undefined} />
                        <StatusBadge status={a.application_status ?? 'applied'} />
                      </div>
                    </div>
                    <p className="text-xs text-muted">{cp?.neighborhood} · {(cp?.categories ?? []).map(c => CATEGORY_LABELS[c]).join(', ')}</p>
                    {a.pitch && <p className="text-sm mt-2 bg-background rounded-xl px-3.5 py-2.5">{a.pitch}</p>}
                    {((a.pitch_portfolio_ids as string[] | null) ?? []).length > 0 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto">
                        {((a.pitch_portfolio_ids as string[]).map(pid => (attachedItems ?? []).find(i => i.id === pid)).filter(Boolean) as { id: string; media_url: string | null; media_type: string; caption: string | null }[]).map(item => (
                          <figure key={item.id} className="shrink-0 w-24">
                            {item.media_type === 'image' && item.media_url
                              ? <img src={item.media_url} alt={item.caption ?? 'Shared portfolio piece'} className="h-16 w-24 object-cover rounded-lg border border-line" />
                              : <div className="h-16 w-24 rounded-lg border border-line bg-sea-soft flex items-center justify-center" aria-hidden>{item.media_type === 'video' ? '🎬' : item.media_type === 'audio' ? '🎵' : '🔗'}</div>}
                            <figcaption className="text-[10px] text-muted truncate mt-0.5">{item.caption ?? ''}</figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                    {a.application_status !== 'accepted' && a.application_status !== 'declined' && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <form action={setApplicationStatus.bind(null, a.id, 'accepted')}>
                          <button className="rounded-full bg-accent text-white px-4 py-1.5 text-sm font-medium hover:opacity-85">Accept & message</button>
                        </form>
                        {a.application_status !== 'shortlisted' && (
                          <form action={setApplicationStatus.bind(null, a.id, 'shortlisted')}>
                            <button className="rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-background">Shortlist</button>
                          </form>
                        )}
                        <form action={setApplicationStatus.bind(null, a.id, 'declined')}>
                          <button className="rounded-full border border-line px-4 py-1.5 text-sm text-muted font-medium hover:bg-background">Decline</button>
                        </form>
                      </div>
                    )}
                    {a.is_matched && <div className="mt-3"><LinkButton href={`/messages/${a.id}`} size="sm" variant="secondary">Open messages</LinkButton></div>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
