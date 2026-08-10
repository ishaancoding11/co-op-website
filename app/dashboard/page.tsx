import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { Card, StatusBadge, EmptyState, LinkButton } from '@/components/ui';
import { displayNameFor } from '@/lib/types';

export default async function Dashboard() {
  const { userId, activeRole, supabase } = await getViewer();
  if (!userId) redirect('/login');

  // No embeds at all on this query — deliberately. business_profiles was
  // dropped (agreements.business_id is a NOT NULL FK; an embed resolves as
  // an inner join, and bookings must stay fully readable regardless of
  // what happens between the two parties later — same principle as
  // suspension in 0009_admin.sql). users:creative_id(display_name) and
  // jobs(title) are dropped too: confirmed via the applicants/messages
  // pages that the users:creative_id embed specifically can silently empty
  // a query for reasons independent of RLS strictness on the base table —
  // a booking history entry must never disappear from this list because of
  // it.
  const { data: agreements } = await supabase.from('agreements')
    .select('*')
    .or(`business_id.eq.${userId},creative_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  const businessIds = [...new Set((agreements ?? []).map(a => a.business_id))];
  const creativeIds = [...new Set((agreements ?? []).map(a => a.creative_id))];
  const jobIds = [...new Set((agreements ?? []).map(a => a.job_id).filter((id): id is string => !!id))];
  const [{ data: bizRows }, { data: creativeRows }, { data: jobRows }] = await Promise.all([
    businessIds.length ? supabase.from('business_profiles').select('user_id, business_name').in('user_id', businessIds) : Promise.resolve({ data: [] }),
    creativeIds.length ? supabase.from('users').select('id, display_name').in('id', creativeIds) : Promise.resolve({ data: [] }),
    jobIds.length ? supabase.from('jobs').select('id, title').in('id', jobIds) : Promise.resolve({ data: [] }),
  ]);
  const businesses = new Map((bizRows ?? []).map(b => [b.user_id, b.business_name]));
  const creativeNames = new Map((creativeRows ?? []).map(u => [u.id, u.display_name]));
  const jobTitles = new Map((jobRows ?? []).map(j => [j.id, j.title]));

  const active = (agreements ?? []).filter(a => !['completed', 'cancelled'].includes(a.status));
  const past = (agreements ?? []).filter(a => ['completed', 'cancelled'].includes(a.status));

  const Row = ({ a }: { a: NonNullable<typeof agreements>[number] }) => {
    const isBiz = a.business_id === userId;
    const otherName = isBiz
      ? displayNameFor(creativeNames.get(a.creative_id))
      : (businesses.get(a.business_id) ?? 'Business');
    const jobTitle = a.job_id ? jobTitles.get(a.job_id) : null;
    const needsMe = (a.status === 'accepted' || a.status === 'in_progress') && !(isBiz ? a.completed_by_business_at : a.completed_by_creative_at) && (isBiz ? a.completed_by_creative_at : a.completed_by_business_at);
    return (
      <Link href={`/agreements/${a.id}`} className="block">
        <Card className={`p-4 flex items-center justify-between gap-3 hover:shadow-[0_8px_30px_rgba(45,42,38,0.1)] transition-shadow ${needsMe ? 'border-accent' : ''}`}>
          <div>
            <p className="font-semibold">{otherName}</p>
            <p className="text-xs text-muted">{jobTitle ?? a.scope ?? 'Custom project'} {a.agreed_price != null ? `· $${a.agreed_price}` : ''}</p>
            {needsMe && <p className="text-xs text-accent font-medium mt-0.5">They marked complete — your turn</p>}
          </div>
          <StatusBadge status={a.status} />
        </Card>
      </Link>
    );
  };

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl">Bookings</h1>
      <p className="text-muted text-sm mt-1">Every agreement, from handshake to done.</p>

      <h2 className="font-semibold mt-8 mb-3">Active</h2>
      {active.length
        ? <div className="space-y-3">{active.map(a => <Row key={a.id} a={a} />)}</div>
        : <EmptyState title="Nothing in flight"
            body={activeRole === 'business' ? 'Match with a creative and agree on scope — it shows up here.' : 'When a business books you, the project lives here.'}
            action={<LinkButton href={activeRole === 'business' ? '/discover' : '/jobs'} variant="ghost">{activeRole === 'business' ? 'Find a creative' : 'Find a gig'}</LinkButton>} />}

      {past.length > 0 && (
        <>
          <h2 className="font-semibold mt-10 mb-3">Past</h2>
          <div className="space-y-3">{past.map(a => <Row key={a.id} a={a} />)}</div>
        </>
      )}
    </div>
  );
}
