import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { resolveReport } from '@/lib/admin-actions';
import { Card, EmptyState } from '@/components/ui';
import { Dropdown } from '@/components/dropdown';
import { AdminStatusBadge } from '../admin-ui';

type ReportRow = {
  id: string; reporter_id: string; reporter_name: string;
  reported_user_id: string; reported_name: string;
  reason: string; details: string | null; status: 'open' | 'resolved' | 'dismissed'; created_at: string;
};

export default async function AdminReports({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.rpc('admin_reports', { p_status: status || null });
  const reports = (data ?? []) as ReportRow[];

  return (
    <div>
      <form className="flex gap-2">
        <Dropdown name="status" defaultValue={status ?? ''} ariaLabel="Filter by status" className="w-40" options={[
          { value: '', label: 'All reports' },
          { value: 'open', label: 'Open' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'dismissed', label: 'Dismissed' },
        ]} />
        <button className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium active:scale-[0.97] hover:opacity-90 transition-[transform,opacity] duration-200 ease-[var(--ease-out)]">Filter</button>
      </form>

      {error ? <p className="text-sm text-red-700 mt-4">Could not load reports.</p> : null}
      {!error && !reports.length ? <EmptyState title="No reports here" body="Reports people file against each other's accounts show up in this queue." /> : null}

      <div className="space-y-3 mt-4">
        {reports.map(r => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-semibold">{r.reporter_name} reported {r.reported_name}</p>
              <AdminStatusBadge status={r.status} />
              <span className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <p className="text-sm mt-1.5"><span className="font-medium">{r.reason}</span>{r.details ? ` — ${r.details}` : ''}</p>
            {r.status === 'open' && (
              <div className="flex gap-2 mt-3">
                <form action={resolveReport.bind(null, r.id, 'resolved')}>
                  <button className="rounded-full bg-accent-soft text-accent px-4 py-1.5 text-sm font-medium hover:bg-line">Mark resolved</button>
                </form>
                <form action={resolveReport.bind(null, r.id, 'dismissed')}>
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
