import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { signOut } from '@/lib/actions';
import { getT } from '@/lib/i18n-server';
import { Card, LinkButton, VerifiedBadge } from '@/components/ui';
import { DeleteAccount } from './delete-account';

export default async function Settings() {
  const { userId, creative, business, activeRole } = await getViewer();
  if (!userId) redirect('/login');
  const { t } = await getT();

  return (
    <div className="py-8 max-w-xl mx-auto">
      <h1 className="font-display text-3xl">{t('settings.title')}</h1>

      {/* Role is chosen once at signup and locked — only the account's own profile shows here. */}
      <Card className="p-5 mt-6">
        <h2 className="font-semibold text-sm">{t('settings.yourProfile')}</h2>
        <div className="mt-3">
          {activeRole === 'creative' && creative ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{t('settings.creativeProfile')}</p>
                <p className="text-xs text-muted">{t('settings.creativeProfileDesc')}</p>
              </div>
              <LinkButton href="/onboarding/creative" variant="ghost" size="sm">{t('settings.edit')}</LinkButton>
            </div>
          ) : activeRole === 'business' && business ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">{business.business_name} {business.is_verified && <VerifiedBadge small />}</p>
                <p className="text-xs text-muted">{business.is_verified ? t('settings.verifiedBusiness') : t('settings.notVerified')}</p>
              </div>
              <div className="flex gap-2">
                <LinkButton href="/onboarding/business" variant="ghost" size="sm">{t('settings.edit')}</LinkButton>
                {!business.is_verified && <LinkButton href="/onboarding/business/verify" size="sm" variant="secondary">{t('settings.verify')}</LinkButton>}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">{t('settings.finishProfile')}</p>
              <LinkButton href={`/onboarding/${activeRole ?? 'creative'}`} size="sm" variant="secondary">{t('settings.continueSetup')}</LinkButton>
            </div>
          )}
        </div>
      </Card>

      {activeRole === 'creative' && creative && (
        <Card className="p-5 mt-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">{t('settings.portfolioTitle')}</h2>
            <p className="text-xs text-muted mt-1">{t('settings.portfolioDesc')}</p>
          </div>
          <LinkButton href="/portfolio" size="sm" variant="secondary">{t('settings.managePortfolio')}</LinkButton>
        </Card>
      )}

      <Card className="p-5 mt-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">{t('settings.billingPlans')}</h2>
          <p className="text-xs text-muted mt-1">{t('settings.manageSubscription')}</p>
        </div>
        <LinkButton href="/billing" size="sm" variant="secondary">{t('settings.goToBilling')}</LinkButton>
      </Card>

      <Card className="p-5 mt-4">
        <h2 className="font-semibold text-sm">{t('settings.aboutPayments')}</h2>
        <p className="text-xs text-muted mt-1.5">{t('settings.aboutPaymentsBody')}</p>
      </Card>

      <Card className="p-5 mt-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">{t('settings.helpSupport')}</h2>
          <p className="text-xs text-muted mt-1">{t('settings.helpSupportDesc')}</p>
        </div>
        <LinkButton href="/support" size="sm" variant="secondary">{t('settings.contactSupport')}</LinkButton>
      </Card>

      <Card className="p-5 mt-4 flex items-center justify-between">
        <p className="text-sm text-muted">{t('settings.signedInVia')}</p>
        <form action={signOut}>
          <button className="rounded-full border border-line px-5 py-2 text-sm font-medium hover:bg-background">{t('settings.signOut')}</button>
        </form>
      </Card>

      <Card className="p-5 mt-4 border-red-200">
        <h2 className="font-semibold text-sm text-red-700">{t('settings.dangerZone')}</h2>
        <div className="mt-3"><DeleteAccount /></div>
      </Card>
    </div>
  );
}
