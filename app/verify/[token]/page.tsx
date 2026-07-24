import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Card, LinkButton, VerifiedBadge } from '@/components/ui';

export default async function ConfirmVerification({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: ok } = await supabase.rpc('confirm_business_verification', { p_token: token });

  return (
    <div className="py-20 max-w-md mx-auto">
      <Card className="p-8 text-center">
        {ok ? (
          <>
            <VerifiedBadge />
            <h1 className="font-display text-2xl mt-3">You&rsquo;re verified!</h1>
            <p className="text-sm text-muted mt-2">Your verified badge now shows on your profile and every job you post.</p>
            <div className="mt-5"><LinkButton href="/jobs/new">Post a job</LinkButton></div>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl">Link expired or invalid</h1>
            <p className="text-sm text-muted mt-2">Verification links last 24 hours. Request a new one from your business settings.</p>
            <div className="mt-5"><LinkButton href="/onboarding/business/verify" variant="ghost">Try again</LinkButton></div>
          </>
        )}
      </Card>
    </div>
  );
}
