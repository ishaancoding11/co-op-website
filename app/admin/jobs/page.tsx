import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { removeJob } from '@/lib/admin-actions';
import { Card, Tag, EmptyState } from '@/components/ui';
import { Dropdown } from '@/components/dropdown';
import { CATEGORY_LABELS, type CreativeCategory } from '@/lib/types';
import { AdminStatusBadge, Metric, Pager, SearchBar } from '../admin-ui';

type JobRow = {
  id: string; title: string; business_name: string; category: CreativeCategory;
  status: 'open' | 'in_progress' | 'completed' | 'closed'; removed_at: string | null;
  application_count: number; created_at: string;
};

export default async function AdminJobs({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const perPage = 50;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.rpc('admin_jobs', {
    p_search: q?.trim() || null, p_status: (status as JobRow['status']) || null,
    p_limit: perPage, p_offset: (page - 1) * perPage,
  });
  const jobs = (data ?? []) as JobRow[];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-48"><SearchBar action="/admin/jobs" value={q} placeholder="Search by job or business name…" hidden={status ? { status } : undefined} /></div>
        <form className="flex gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          <Dropdown name="status" defaultValue={status ?? ''} ariaLabel="Filter by status" className="w-44" options={[
            { value: '', label: 'All statuses' },
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'closed', label: 'Closed / removed' },
          ]} />
          <button className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-85">Filter</button>
        </form>
      </div>

      {error ? <p className="text-sm text-red-700 mt-4">Could not load jobs.</p> : null}
      {!error && !jobs.length ? <EmptyState title="No jobs match" /> : null}

      <div className="space-y-3 mt-4">
        {jobs.map(j => (
          <Card key={j.id} className="p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Link href={`/jobs/${j.id}`} className="font-semibold hover:underline underline-offset-2">{j.title}</Link>
              <AdminStatusBadge status={j.status} />
              {j.removed_at && <Tag>removed by staff</Tag>}
              <span className="text-xs text-muted">{j.business_name} · posted {new Date(j.created_at).toLocaleDateString('en-US')}</span>
            </div>
            <div className="flex flex-wrap gap-2 items-center mt-2">
              <Tag tone="accent">{CATEGORY_LABELS[j.category]}</Tag>
              <Metric label="applicants" value={String(j.application_count)} />
            </div>
            {!j.removed_at && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted hover:text-foreground">Remove this job</summary>
                <form action={removeJob} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="jobId" value={j.id} />
                  <input required minLength={3} maxLength={500} name="reason" placeholder="Reason (kept in the audit log)"
                    className="flex-1 min-w-48 rounded-xl border border-line bg-card px-3.5 py-2 text-sm focus:border-accent focus:outline-none" />
                  <button className="rounded-full bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 shrink-0">Remove</button>
                </form>
              </details>
            )}
          </Card>
        ))}
      </div>

      <Pager page={page} count={jobs.length} perPage={perPage} extraParams={{ ...(q ? { q } : {}), ...(status ? { status } : {}) }} />
    </div>
  );
}
