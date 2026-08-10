import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { Avatar, StatusBadge, EmptyState, LinkButton } from '@/components/ui';
import { LineIcon } from '@/components/line-icons';
import { displayNameFor, formatMoney, type Currency } from '@/lib/types';

type Agreement = {
  id: string; status: string; scope: string | null; agreed_price: number | null; currency: Currency;
  business_id: string; creative_id: string;
  completed_by_business_at: string | null; completed_by_creative_at: string | null;
  business_profiles: { business_name: string } | null;
  users: { display_name: string | null } | null;
  jobs: { title: string } | null;
};

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-9 first:mt-8">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{children}</h2>
      {count != null && <span className="text-[11px] tabular-nums text-muted/70">{count}</span>}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function Chip({ value, label, tone = 'neutral' }: { value: string; label: string; tone?: 'neutral' | 'accent' }) {
  const cls = tone === 'accent'
    ? 'border-accent/30 bg-accent-soft'
    : 'border-line bg-card hover:border-line-strong';
  const valueCls = tone === 'accent' ? 'text-accent-deep' : 'text-foreground';
  const labelCls = tone === 'accent' ? 'text-accent-deep/80' : 'text-muted';
  return (
    <span className={`inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${cls}`}>
      <span className={`text-sm font-semibold tabular-nums ${valueCls}`}>{value}</span>
      <span className={`text-xs ${labelCls}`}>{label}</span>
    </span>
  );
}

export default async function Dashboard() {
  const { userId, activeRole, supabase } = await getViewer();
  if (!userId) redirect('/login');

  const { data } = await supabase.from('agreements')
    .select('*, business_profiles(business_name), users:creative_id(display_name), jobs(title)')
    .or(`business_id.eq.${userId},creative_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  const agreements = (data ?? []) as Agreement[];
  const active = agreements.filter(a => !['completed', 'cancelled'].includes(a.status));
  const past = agreements.filter(a => ['completed', 'cancelled'].includes(a.status));

  const needsMe = (a: Agreement) => {
    const isBiz = a.business_id === userId;
    const mine = isBiz ? a.completed_by_business_at : a.completed_by_creative_at;
    const theirs = isBiz ? a.completed_by_creative_at : a.completed_by_business_at;
    return (a.status === 'accepted' || a.status === 'in_progress') && !mine && !!theirs;
  };
  const awaiting = active.filter(needsMe);
  const inProgress = active.filter(a => !needsMe(a));

  const inFlightValue = active.reduce((s, a) => s + (a.agreed_price ?? 0), 0);
  const currency = active.find(a => a.agreed_price != null)?.currency ?? 'USD';

  const Row = ({ a, priority = false }: { a: Agreement; priority?: boolean }) => {
    const isBiz = a.business_id === userId;
    const otherName = isBiz
      ? displayNameFor(a.users?.display_name)
      : (a.business_profiles?.business_name ?? 'Business');
    const sub = a.jobs?.title ?? a.scope ?? 'Custom project';
    return (
      <Link
        href={`/agreements/${a.id}`}
        {...(priority ? { 'data-priority': '' } : {})}
        className="group block rounded-2xl border border-line bg-card p-4
                   transition-[border-color,box-shadow,transform] duration-200 ease-[var(--ease-out)]
                   hover:border-line-strong hover:shadow-[var(--shadow-md)]
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                   active:scale-[0.99]
                   data-[priority]:border-l-2 data-[priority]:border-l-accent data-[priority]:pl-[14px]"
      >
        <div className="flex items-center gap-3">
          <span className="shrink-0 ring-1 ring-line rounded-full">
            <Avatar name={otherName} size={40} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-foreground">{otherName}</p>
              <StatusBadge status={a.status} />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted">
              {sub}
              {a.agreed_price != null && (
                <><span className="text-line-strong"> · </span><span className="tabular-nums">{formatMoney(a.agreed_price, a.currency)}</span></>
              )}
            </p>
            {priority && <p className="mt-1 text-xs font-medium text-accent">Your turn — mark complete</p>}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" aria-hidden
            className="shrink-0 text-muted/50 transition-[color,transform] duration-200 ease-[var(--ease-out)]
                       group-hover:text-muted group-hover:translate-x-0.5">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </div>
      </Link>
    );
  };

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl">Bookings</h1>
      <p className="text-muted text-sm mt-1">Every agreement, from handshake to done.</p>

      {active.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Chip value={String(active.length)} label={active.length === 1 ? 'active' : 'active'} />
          {awaiting.length > 0 && <Chip value={String(awaiting.length)} label="awaiting you" tone="accent" />}
          {inFlightValue > 0 && <Chip value={formatMoney(inFlightValue, currency)} label="in flight" />}
        </div>
      )}

      {awaiting.length > 0 && (
        <>
          <SectionLabel count={awaiting.length}>Awaiting you</SectionLabel>
          <div className="space-y-3 stagger">{awaiting.map(a => <Row key={a.id} a={a} priority />)}</div>
        </>
      )}

      {inProgress.length > 0 ? (
        <>
          <SectionLabel count={inProgress.length}>In progress</SectionLabel>
          <div className="space-y-3 stagger">{inProgress.map(a => <Row key={a.id} a={a} />)}</div>
        </>
      ) : awaiting.length === 0 && (
        <div className="mt-8">
          <EmptyState
            icon={<LineIcon name="clipboard" size={30} />}
            title="Nothing in flight yet"
            body={activeRole === 'business'
              ? 'Once you match with a creative and agree on scope, the project shows up here — from kickoff through delivery.'
              : 'When a business books you, the project lives here. You\'ll see scope, price, and a big done button when it\'s time.'}
            action={<LinkButton href={activeRole === 'business' ? '/browse' : '/jobs'} variant="secondary">{activeRole === 'business' ? 'Browse creatives' : 'Browse open jobs'}</LinkButton>}
          />
        </div>
      )}

      {past.length > 0 && (
        <>
          <SectionLabel count={past.length}>Past</SectionLabel>
          <div className="space-y-3 opacity-75">{past.map(a => <Row key={a.id} a={a} />)}</div>
        </>
      )}
    </div>
  );
}
