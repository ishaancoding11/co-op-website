import { notFound, redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { Card, NoFeeNote } from '@/components/ui';
import { AgreementForm } from './agreement-form';
import type { Package } from '@/lib/types';

export default async function NewAgreement({ searchParams }: { searchParams: Promise<{ match?: string }> }) {
  const { match } = await searchParams;
  const { userId, supabase } = await getViewer();
  if (!userId) redirect('/login');
  if (!match) notFound();

  const { data: m } = await supabase.from('matches')
    .select('*, business_profiles(business_name), users:creative_id(display_name), jobs(title)')
    .eq('id', match).maybeSingle();
  if (!m || !m.is_matched) notFound();

  const { data: packages } = await supabase.from('packages').select('*').eq('creative_id', m.creative_id).order('price');
  const isBiz = m.business_id === userId;
  const otherName = isBiz
    ? ((m.users as { display_name: string | null } | null)?.display_name ?? 'the creative')
    : ((m.business_profiles as { business_name: string } | null)?.business_name ?? 'the business');

  return (
    <div className="py-10 max-w-xl mx-auto">
      <h1 className="font-display text-3xl">Work together</h1>
      <p className="text-muted text-sm mt-1">Lock in the scope with {otherName}. Both of you will mark it complete when it&rsquo;s done.</p>
      <div className="mt-4"><NoFeeNote /></div>
      <Card className="p-6 mt-4">
        <AgreementForm matchId={m.id} jobTitle={(m.jobs as { title: string } | null)?.title ?? null} packages={(packages ?? []) as Package[]} />
      </Card>
    </div>
  );
}
