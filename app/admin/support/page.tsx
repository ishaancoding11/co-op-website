import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { resolveSupportTicket } from '@/lib/admin-actions';
import { Card, EmptyState } from '@/components/ui';
import { Dropdown } from '@/components/dropdown';
import { AdminStatusBadge } from '../admin-ui';

type TicketRow = {
  id: string; user_id: string; display_name: string;
  subject: string; body: string; status: 'open' | 'resolved' | 'dismissed';
  handled_by: string | null; handled_at: string | null; created_at: string;
};

export default async function AdminSupport({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc('admin_support_tickets', { p_status: status || null });
  const tickets = (data ?? []) as TicketRow[];

  return (
    <div>
      <form className="flex gap-2">
        <Dropdown name="status" defaultValue={status ?? ''} ariaLabel="Filter by status" className="w-40" options={[
          { value: '', label: 'All tickets' },
          { value: 'open', label: 'Open' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'dismissed', label: 'Dismissed' },
        ]} />
        <button className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium active:scale-[0.97] hover:opacity-90 transition-[transform,opacity] duration-200 ease-[var(--ease-out)]">Filter</button>
      </form>

      {error ? <p className="text-sm text-red-700 mt-4">Could not load support tickets.</p> : null}
      {!error && !tickets.length ? <EmptyState title="No tickets here" body="Messages people send from the Contact support page show up in this queue." /> : null}

      <div className="space-y-3 mt-4">
        {tickets.map(t => (
          <Card key={t.id} className="p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-semibold">{t.subject}</p>
              <AdminStatusBadge status={t.status} />
              <span className="text-xs text-muted">{t.display_name} · {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <p className="text-sm mt-1.5 whitespace-pre-wrap">{t.body}</p>
            {t.status === 'open' && (
              <div className="flex gap-2 mt-3">
                <form action={resolveSupportTicket.bind(null, t.id, 'resolved')}>
                  <button className="rounded-full bg-accent-soft text-accent px-4 py-1.5 text-sm font-medium hover:bg-line">Mark resolved</button>
                </form>
                <form action={resolveSupportTicket.bind(null, t.id, 'dismissed')}>
                  <button className="rounded-full border border-line px-4 py-1.5 text-sm text-muted font-medium hover:bg-background">Dismiss</button>
                </form>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
