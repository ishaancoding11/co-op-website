import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { openBillingPortal } from '@/lib/billing-actions';
import { PLAN_PRICING, PLAN_PRICING_KZT, PLAN_LABELS, type SubscriptionPlan } from '@/lib/plans';
import { Card, NoFeeNote } from '@/components/ui';
import { PlanCard } from './plan-card';
import { getT } from '@/lib/i18n-server';
import type { Currency } from '@/lib/types';

export default async function Billing() {
  const { userId, activeRole, creative, business, supabase } = await getViewer();
  if (!userId) redirect('/login');
  if (!activeRole) redirect('/');
  const { t } = await getT();

  const isCreative = activeRole === 'creative';
  // Which rail the user pays through follows the currency on their own profile:
  // a Kazakhstan account (KZT) can't use Stripe Checkout and takes the manual lane.
  const currency: Currency = (isCreative ? creative?.currency : business?.currency) ?? 'USD';
  type CreativeQuota = { trialing: boolean; trial_ends_at: string | null; plan: SubscriptionPlan | null; monthly_limit: number | null; used: number; unlimited: boolean; can_accept: boolean };
  type BusinessQuota = { trialing: boolean; trial_ends_at: string | null; plan: SubscriptionPlan | null; job_cap: number | null; active_jobs: number; unlimited: boolean; can_post: boolean };
  const { data: quota } = isCreative
    ? (await supabase.rpc('my_creative_quota').maybeSingle()) as { data: CreativeQuota | null }
    : (await supabase.rpc('my_business_quota').maybeSingle()) as { data: BusinessQuota | null };

  const plans: SubscriptionPlan[] = isCreative
    ? ['creative_basic', 'creative_premium']
    : ['business_standard'];

  const trialEndsAt = quota?.trial_ends_at ? new Date(quota.trial_ends_at) : null;
  const trialing = !!quota?.trialing;
  const currentPlan = (quota?.plan as SubscriptionPlan | null) ?? null;
  const creativeQuota = isCreative ? (quota as CreativeQuota | null) : null;
  const businessQuota = !isCreative ? (quota as BusinessQuota | null) : null;

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <h1 className="font-display text-3xl">{t('billing.title')}</h1>
      <p className="text-muted text-sm mt-1">
        {isCreative
          ? 'Subscribe to keep applying for and accepting jobs after your trial.'
          : 'Subscribe to keep posting jobs after your trial.'}
      </p>

      <Card className="p-5 mt-6">
        {currentPlan ? (
          <p className="text-sm">
            You&rsquo;re on <strong>{PLAN_LABELS[currentPlan]}</strong>.
            {isCreative
              ? creativeQuota?.unlimited ? ' Unlimited job applications/acceptances.' : ` ${creativeQuota?.used ?? 0} of ${creativeQuota?.monthly_limit ?? '—'} accepted this month.`
              : businessQuota?.unlimited ? ' Unlimited active job posts.' : ` ${businessQuota?.active_jobs ?? 0} of ${businessQuota?.job_cap ?? '—'} active job posts.`}
          </p>
        ) : trialing ? (
          <p className="text-sm">
            You&rsquo;re on your <strong>free trial</strong> until {trialEndsAt?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            {isCreative ? ' You can accept 1 job during your trial.' : ' You can post 1 job during your trial.'}
          </p>
        ) : (
          <p className="text-sm text-accent font-medium">
            Your free trial has ended. Subscribe below to {isCreative ? 'accept new jobs' : 'post new jobs'} — your existing matches and messages stay available either way.
          </p>
        )}
        {currentPlan && (
          <form action={openBillingPortal} className="mt-3">
            <button className="rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-background">{t('billing.manage')}</button>
          </form>
        )}
      </Card>

      <div className={`grid gap-4 mt-6 ${plans.length > 1 ? 'sm:grid-cols-2' : 'max-w-sm'}`}>
        {plans.map(plan => {
          const p = PLAN_PRICING[plan];
          const kzt = PLAN_PRICING_KZT[plan];
          return (
            <PlanCard key={plan} plan={plan} label={PLAN_LABELS[plan]} blurb={p.blurb} features={p.features}
              monthly={p.monthly} annual={p.annual} annualSavingsLabel={p.annualSavingsLabel}
              currency={currency} monthlyKzt={kzt.monthly} annualKzt={kzt.annual}
              current={currentPlan === plan} highlight={plan === 'creative_premium' || plan === 'business_standard'}
              labels={{
                choose: t('billing.choose'), opening: t('billing.opening'), currentPlan: t('billing.currentPlan'),
                monthly: t('billing.monthly'), annual: t('billing.annual'),
                requestPlan: t('billing.requestPlan'), requesting: t('billing.requesting'), requested: t('billing.requestSent'),
                billedYearly: t('billing.billedYearly'), kztNotice: t('billing.kztNotice'),
              }} />
          );
        })}
      </div>

      <div className="mt-6 max-w-xl"><NoFeeNote /></div>
    </div>
  );
}
