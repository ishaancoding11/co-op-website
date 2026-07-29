import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { signOut } from '@/lib/actions';
import { Card, LinkButton, VerifiedBadge } from '@/components/ui';
import { DeleteAccount } from './delete-account';

export default async function Settings() {
  const { userId, creative, business, activeRole } = await getViewer();
  if (!userId) redirect('/login');

  return (
    <div className="py-8 max-w-xl mx-auto">
      <h1 className="font-display text-3xl">Settings</h1>

      {/* Role is chosen once at signup and locked — only the account's own profile shows here. */}
      <Card className="p-5 mt-6">
        <h2 className="font-semibold text-sm">Your profile</h2>
        <div className="mt-3">
          {activeRole === 'creative' && creative ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Creative profile</p>
                <p className="text-xs text-muted">Visible to local businesses in discovery and search.</p>
              </div>
              <LinkButton href="/onboarding/creative" variant="ghost" size="sm">Edit</LinkButton>
            </div>
          ) : activeRole === 'business' && business ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">{business.business_name} {business.is_verified && <VerifiedBadge small />}</p>
                <p className="text-xs text-muted">{business.is_verified ? 'Verified local business.' : 'Not verified yet — verification is required to post jobs.'}</p>
              </div>
              <div className="flex gap-2">
                <LinkButton href="/onboarding/business" variant="ghost" size="sm">Edit</LinkButton>
                {!business.is_verified && <LinkButton href="/onboarding/business/verify" size="sm" variant="secondary">Verify</LinkButton>}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">Finish setting up your profile to appear on Co-op.</p>
              <LinkButton href={`/onboarding/${activeRole ?? 'creative'}`} size="sm" variant="secondary">Continue setup</LinkButton>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5 mt-4">
        <h2 className="font-semibold text-sm">About payments</h2>
        <p className="text-xs text-muted mt-1.5">Co-op takes no fees, commissions, or cuts — ever. Payment is always arranged directly between the business and the creative.</p>
      </Card>

      <Card className="p-5 mt-4 flex items-center justify-between">
        <p className="text-sm text-muted">Signed in via Google</p>
        <form action={signOut}>
          <button className="rounded-full border border-line px-5 py-2 text-sm font-medium hover:bg-background">Sign out</button>
        </form>
      </Card>

      <Card className="p-5 mt-4 border-red-200">
        <h2 className="font-semibold text-sm text-red-700">Danger zone</h2>
        <div className="mt-3"><DeleteAccount /></div>
      </Card>
    </div>
  );
}
