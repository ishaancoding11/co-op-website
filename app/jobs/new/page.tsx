import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { Card, LinkButton } from '@/components/ui';
import { JobForm } from './job-form';

export default async function NewJob() {
  const { userId, business } = await getViewer();
  if (!userId) redirect('/login?role=business');
  if (!business) redirect('/onboarding/business');

  if (!business.is_verified) {
    return (
      <div className="py-16 max-w-md mx-auto">
        <Card className="p-8 text-center">
          <p className="text-3xl" aria-hidden>🔒</p>
          <h1 className="font-display text-2xl mt-2">Verify to post jobs</h1>
          <p className="text-sm text-muted mt-2">Job posting is reserved for verified local businesses — it keeps the feed trustworthy for creatives.</p>
          <div className="mt-5"><LinkButton href="/onboarding/business/verify">Verify {business.business_name}</LinkButton></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-10 max-w-xl mx-auto">
      <h1 className="font-display text-3xl">Post a job</h1>
      <p className="text-muted text-sm mt-1">Structured and specific gets the best applications.</p>
      <Card className="p-6 mt-6"><JobForm defaultLocation={business.neighborhood} /></Card>
    </div>
  );
}
