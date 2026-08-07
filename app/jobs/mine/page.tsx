import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { Card, StatusBadge, EmptyState, LinkButton, Tag } from '@/components/ui';
import { categoryLabel, priceRange, type Job } from '@/lib/types';
import { getLocale } from '@/lib/i18n-server';

export default async function MyJobs() {
  const { userId, business, supabase } = await getViewer();
  if (!userId) redirect('/login?role=business');
  if (!business) redirect('/onboarding/business');
  const locale = await getLocale();

  const { data: jobs } = await supabase.from('jobs').select('*').eq('business_id', userId).order('created_at', { ascending: false });
  const jobIds = (jobs ?? []).map(j => j.id);
  const { data: apps } = jobIds.length
    ? await supabase.from('matches').select('job_id').in('job_id', jobIds).eq('creative_action', 'liked')
    : { data: [] };

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl">My jobs</h1>
        <LinkButton href="/jobs/new">+ Post a job</LinkButton>
      </div>
      {!jobs?.length ? (
        <EmptyState title="No jobs yet" body="Post your first job and local creatives will start applying."
          action={<LinkButton href="/jobs/new">Post a job</LinkButton>} />
      ) : (
        <div className="space-y-3 mt-6">
          {(jobs as Job[]).map(j => {
            const count = (apps ?? []).filter(a => a.job_id === j.id).length;
            return (
              <Link key={j.id} href={`/jobs/${j.id}/applicants`} className="block group">
                <Card className="p-5 flex items-center justify-between gap-3 hover:shadow-[0_8px_30px_rgba(45,42,38,0.1)] transition-shadow">
                  <div>
                    <h2 className="font-semibold group-hover:underline underline-offset-2">{j.title}</h2>
                    <p className="text-xs text-muted mt-0.5">{categoryLabel(j.category, locale)} · {priceRange(j.budget_min, j.budget_max, j.currency) ?? 'Budget TBD'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag tone={count ? 'accent' : 'neutral'}>{count} applicant{count === 1 ? '' : 's'}</Tag>
                    <StatusBadge status={j.status} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
