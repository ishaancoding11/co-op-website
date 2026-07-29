import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { Card, StatusBadge, EmptyState, LinkButton } from '@/components/ui';
import { displayNameFor } from '@/lib/types';

export default async function Dashboard() {
  const { userId, activeRole, supabase } = await getViewer();
  if (!userId) redirect('/login');

  const { data: agreements } = await supabase.from('agreements')
    .select('*, business_profiles(business_name), users:creative_id(display_name), jobs(title)')
    .or(`business_id.eq.${userId},creative_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  const active = (agreements ?? []).filter(a => !['completed', 'cancelled'].includes(a.status));
  const past = (agreements ?? []).filter(a => ['completed', 'cancelled'].includes(a.status));

  const Row = ({ a }: { a: NonNullable<typeof agreements>[number] }) => {
    const isBiz = a.business_id === userId;
    const otherName = isBiz
      ? displayNameFor((a.users as { display_name: string | null } | null)?.display_name)
      : ((a.business_profiles as { business_name: string } | null)?.business_name ?? 'Business');
    const needsMe = (a.status === 'accepted' || a.status === 'in_progress') && !(isBiz ? a.completed_by_business_at : a.completed_by_creative_at) && (isBiz ? a.completed_by_creative_at : a.completed_by_business_at);
    return (
      <Link href={`/agreements/${a.id}`} className="block">
        <Card className={`p-4 flex items-center justify-between gap-3 hover:shadow-[0_8px_30px_rgba(45,42,38,0.1)] transition-shadow ${needsMe ? 'border-accent' : ''}`}>
          <div>
            <p className="font-semibold">{otherName}</p>
            <p className="text-xs text-muted">{(a.jobs as { title: string } | null)?.title ?? a.scope ?? 'Custom project'} {a.agreed_price != null ? `· $${a.agreed_price}` : ''}</p>
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
