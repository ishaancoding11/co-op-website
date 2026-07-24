import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { Card, VerifiedBadge, LinkButton } from '@/components/ui';
import { VerifyForm } from './verify-form';

export default async function VerifyPage() {
  const { userId, business } = await getViewer();
  if (!userId) redirect('/login?role=business');
  if (!business) redirect('/onboarding/business');

  return (
    <div className="py-10 max-w-xl mx-auto">
      <h1 className="font-display text-3xl">Verify {business.business_name}</h1>
      {business.is_verified ? (
        <Card className="p-8 mt-6 text-center">
          <VerifiedBadge />
          <p className="mt-3 text-sm text-muted">You&rsquo;re verified — the badge now shows on your profile and job posts.</p>
          <div className="mt-5"><LinkButton href="/jobs/new">Post your first job</LinkButton></div>
        </Card>
      ) : (
        <>
          <p className="text-muted text-sm mt-1">
            Enter an email on your business&rsquo;s own domain (free providers like Gmail or Yahoo aren&rsquo;t accepted). We&rsquo;ll send a confirmation link. Verification is required before posting jobs.
          </p>
          <Card className="p-6 mt-6"><VerifyForm /></Card>
        </>
      )}
    </div>
  );
}
