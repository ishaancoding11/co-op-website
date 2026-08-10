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

  // business_profiles is fetched separately below, not embedded: matches.
  // business_id is a NOT NULL FK, so an embed resolves as an inner join —
  // if the creative has blocked (or been blocked by) this business, the
  // whole match would 404 here instead of just missing the business's name.
  const { data: m } = await supabase.from('matches')
    .select('*, users:creative_id(display_name), jobs(title)')
    .eq('id', match).maybeSingle();
  if (!m || !m.is_matched) notFound();

  const { data: packages } = await supabase.from('packages').select('*').eq('creative_id', m.creative_id).order('price');
  const isBiz = m.business_id === userId;
  let otherName = 'the business';
  if (isBiz) {
    otherName = displayNameFor((m.users as { display_name: string | null } | null)?.display_name);
  } else {
    const { data: biz } = await supabase.from('business_profiles').select('business_name').eq('user_id', m.business_id).maybeSingle();
    otherName = biz?.business_name ?? 'the business';
  }

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
