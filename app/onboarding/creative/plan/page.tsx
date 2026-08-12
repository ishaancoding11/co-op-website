import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { PLAN_PRICING, PLAN_LABELS, type SubscriptionPlan } from '@/lib/plans';
import { PlanCard } from '@/app/billing/plan-card';

export default async function CreativePlanOnboarding() {
  const { userId, creative, supabase } = await getViewer();
  if (!userId) redirect('/login?role=creative');
  if (!creative) redirect('/onboarding/creative');

  const { data: sub } = await supabase.from('subscriptions').select('id')
    .eq('user_id', userId).in('status', ['pending', 'active']).maybeSingle();
  if (sub) redirect('/jobs');

  const plans: SubscriptionPlan[] = ['creative_basic', 'creative_premium'];

  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl">Choose your plan</h1>
      <p className="text-muted text-sm mt-1 font-bold">
        Pick your plan below. We&rsquo;ll save your payment info now, but you won&rsquo;t be charged anything until you land your first match. Browse and apply freely in the meantime — it&rsquo;s completely free until it actually works for you.
      </p>
      <div className="grid gap-4 mt-6 sm:grid-cols-2">
        {plans.map(plan => {
          const p = PLAN_PRICING[plan];
          return (
            <PlanCard key={plan} plan={plan} label={PLAN_LABELS[plan]} blurb={p.blurb} features={p.features}
              monthly={p.monthly} annual={p.annual} annualSavingsLabel={p.annualSavingsLabel}
              current={false} highlight={plan === 'creative_premium'} />
          );
        })}
      </div>
    </div>
  );
}
