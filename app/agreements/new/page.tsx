import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { Card, NoFeeNote } from '@/components/ui';
import { AgreementForm } from './agreement-form';
import { displayNameFor, type Package } from '@/lib/types';

export default async function NewAgreement({ searchParams }: { searchParams: Promise<{ match?: string }> }) {
  const { match } = await searchParams;
  const { userId, supabase } = await getViewer();
  if (!userId) redirect('/login');
  if (!match) notFound();

  // No embeds at all on this query — deliberately. business_profiles was
  // dropped (matches.business_id is a NOT NULL FK; an embed resolves as an
  // inner join, and a block would 404 this page instead of just missing
  // the business's name). users:creative_id(display_name) and jobs(title)
  // are dropped too: confirmed via the applicants/messages pages that the
  // users:creative_id embed specifically can silently empty a matches
  // query for reasons independent of RLS strictness on the base table.
  const { data: m } = await supabase.from('matches').select('*').eq('id', match).maybeSingle();
  if (!m || !m.is_matched) notFound();

  const { data: packages } = await supabase.from('packages').select('*').eq('creative_id', m.creative_id).order('price');
  const isBiz = m.business_id === userId;
  let otherName = 'the business';
  let jobTitle: string | null = null;
  if (isBiz) {
    const { data: u } = await supabase.from('users').select('display_name').eq('id', m.creative_id).maybeSingle();
    otherName = displayNameFor(u?.display_name);
  } else {
    const { data: biz } = await supabase.from('business_profiles').select('business_name').eq('user_id', m.business_id).maybeSingle();
    otherName = biz?.business_name ?? 'the business';
  }
  if (m.job_id) {
    const { data: job } = await supabase.from('jobs').select('title').eq('id', m.job_id).maybeSingle();
    jobTitle = job?.title ?? null;
  }

  return (
    <div className="py-10 max-w-xl mx-auto">
      <h1 className="font-display text-3xl">Work together</h1>
      <p className="text-muted text-sm mt-1">Lock in the scope with {otherName}. Both of you will mark it complete when it&rsquo;s done.</p>
      <div className="mt-4"><NoFeeNote /></div>
      <Card className="p-6 mt-4">
        <AgreementForm matchId={m.id} jobTitle={jobTitle} packages={(packages ?? []) as Package[]} />
      </Card>
    </div>
  );
}
