import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { setRole, signOut } from '@/lib/actions';
import { Card, LinkButton, VerifiedBadge } from '@/components/ui';

export default async function Settings() {
  const { userId, creative, business, activeRole } = await getViewer();
  if (!userId) redirect('/login');

  async function switchTo(role: 'creative' | 'business') {
    'use server';
    await setRole(role);
    redirect(role === 'creative' ? '/jobs' : '/discover');
  }

  return (
    <div className="py-8 max-w-xl mx-auto">
      <h1 className="font-display text-3xl">Settings</h1>

      <Card className="p-5 mt-6">
        <h2 className="font-semibold text-sm">Your profiles</h2>
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Creative profile {activeRole === 'creative' && <span className="text-xs text-sea">· active</span>}</p>
              <p className="text-xs text-muted">{creative ? 'Set up' : 'Not created yet'}</p>
            </div>
            {creative
              ? <div className="flex gap-2">
                  <LinkButton href="/onboarding/creative" variant="ghost" size="sm">Edit</LinkButton>
                  {activeRole !== 'creative' && <form action={switchTo.bind(null, 'creative')}><button className="rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-medium">Switch to</button></form>}
                </div>
              : <LinkButton href="/onboarding/creative" size="sm" variant="secondary">Create</LinkButton>}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">Business profile {business?.is_verified && <VerifiedBadge small />} {activeRole === 'business' && <span className="text-xs text-sea">· active</span>}</p>
              <p className="text-xs text-muted">{business ? business.business_name : 'Not created yet'}</p>
            </div>
            {business
              ? <div className="flex gap-2">
                  <LinkButton href="/onboarding/business" variant="ghost" size="sm">Edit</LinkButton>
                  {!business.is_verified && <LinkButton href="/onboarding/business/verify" size="sm" variant="secondary">Verify</LinkButton>}
                  {activeRole !== 'business' && <form action={switchTo.bind(null, 'business')}><button className="rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-medium">Switch to</button></form>}
                </div>
              : <LinkButton href="/onboarding/business" size="sm" variant="secondary">Create</LinkButton>}
          </div>
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
    </div>
  );
}
