import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { openBillingPortal } from '@/lib/billing-actions';
import { PLAN_PRICING, PLAN_LABELS, type SubscriptionPlan } from '@/lib/plans';
import { Card, NoFeeNote } from '@/components/ui';
import { PlanCard } from './plan-card';

export default async function Billing() {
  const { userId, activeRole, supabase } = await getViewer();
  if (!userId) redirect('/login');
  if (!activeRole) redirect('/');

  const isCreative = activeRole === 'creative';
  type CreativeQuota = { pending: boolean; pending_since: string | null; current_period_start: string | null; needs_plan_setup: boolean; plan: SubscriptionPlan | null; monthly_limit: number | null; used: number; unlimited: boolean; can_apply: boolean };
  type BusinessQuota = { pending: boolean; pending_since: string | null; current_period_start: string | null; needs_plan_setup: boolean; plan: SubscriptionPlan | null; job_cap: number | null; active_jobs: number; unlimited: boolean; can_post: boolean };
  const { data: quota } = isCreative
    ? (await supabase.rpc('my_creative_quota').maybeSingle()) as { data: CreativeQuota | null }
    : (await supabase.rpc('my_business_quota').maybeSingle()) as { data: BusinessQuota | null };

  const plans: SubscriptionPlan[] = isCreative
    ? ['creative_basic', 'creative_premium']
    : ['business_standard'];

  const pendingSince = quota?.pending_since ? new Date(quota.pending_since) : null;
  const billingSince = quota?.current_period_start ? new Date(quota.current_period_start) : null;
  const pending = !!quota?.pending;
  const needsPlanSetup = !!quota?.needs_plan_setup;
  const currentPlan = (quota?.plan as SubscriptionPlan | null) ?? null;
  const creativeQuota = isCreative ? (quota as CreativeQuota | null) : null;
  const businessQuota = !isCreative ? (quota as BusinessQuota | null) : null;
  // Active means status='active' in the DB — the plan field alone isn't
  // enough to tell active from pending, since pending subscriptions have a
  // chosen plan too (that's the whole point: pick a plan, don't pay yet).
  const active = !!currentPlan && !pending;

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <h1 className="font-display text-3xl">Billing & plans</h1>
      <p className="text-muted text-sm mt-1">Subscribe now — you won&rsquo;t be charged until your first match.</p>

      <Card className="p-5 mt-6">
        {active && currentPlan ? (
          <p className="text-sm">
            <strong>Active</strong> on <strong>{PLAN_LABELS[currentPlan]}</strong>{billingSince && <>, billing since {billingSince.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</>}.
            {isCreative
              ? creativeQuota?.unlimited ? ' Unlimited job applications.' : ` ${creativeQuota?.used ?? 0} of ${creativeQuota?.monthly_limit ?? '—'} applied to this month.`
              : businessQuota?.unlimited ? ' Unlimited active job posts.' : ` ${businessQuota?.active_jobs ?? 0} of ${businessQuota?.job_cap ?? '—'} active job posts.`}
          </p>
        ) : pending && currentPlan ? (
          <p className="text-sm">
            <strong className="text-accent">Pending</strong> on <strong>{PLAN_LABELS[currentPlan]}</strong> — no charge until your first match.
            {pendingSince && <> Added {pendingSince.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</>}
            {' '}Unlimited {isCreative ? 'applications' : 'job posts'} in the meantime.
          </p>
        ) : needsPlanSetup ? (
          <p className="text-sm text-accent font-medium">
            You&rsquo;ve made your first match — add a plan and payment method below to keep {isCreative ? 'applying to jobs' : 'posting jobs'}. Your existing matches and messages stay available either way.
          </p>
        ) : (
          <p className="text-sm text-muted">
            No plan yet — unlimited {isCreative ? 'applications' : 'job posts'} until your first match. Choose a plan below whenever you&rsquo;re ready.
          </p>
        )}
        {currentPlan && (
          <form action={openBillingPortal} className="mt-3">
            <button className="rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:bg-background">Manage billing</button>
          </form>
        )}
      </Card>

      <div className={`grid gap-4 mt-6 ${plans.length > 1 ? 'sm:grid-cols-2' : 'max-w-sm'}`}>
        {plans.map(plan => {
          const p = PLAN_PRICING[plan];
          return (
            <PlanCard key={plan} plan={plan} label={PLAN_LABELS[plan]} blurb={p.blurb} features={p.features}
              monthly={p.monthly} annual={p.annual} annualSavingsLabel={p.annualSavingsLabel}
              current={currentPlan === plan} highlight={plan === 'creative_premium' || plan === 'business_standard'} />
          );
        })}
      </div>

      <div className="mt-6 max-w-xl"><NoFeeNote /></div>
    </div>
  );
}
