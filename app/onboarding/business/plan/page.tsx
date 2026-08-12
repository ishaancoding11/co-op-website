import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { PLAN_PRICING, PLAN_LABELS, type SubscriptionPlan } from '@/lib/plans';
import { PlanCard } from '@/app/billing/plan-card';

export default async function BusinessPlanOnboarding() {
  const { userId, business, supabase } = await getViewer();
  if (!userId) redirect('/login?role=business');
  if (!business) redirect('/onboarding/business');

  const { data: sub } = await supabase.from('subscriptions').select('id')
    .eq('user_id', userId).in('status', ['pending', 'active']).maybeSingle();
  if (sub) redirect(business.is_verified ? `/business/${userId}` : '/onboarding/business/verify');

  const plan: SubscriptionPlan = 'business_standard';
  const p = PLAN_PRICING[plan];

  return (
    <div className="py-10 max-w-xl mx-auto">
      <h1 className="font-display text-3xl">Choose your plan</h1>
      <p className="text-muted text-sm mt-1 font-bold">
        Pick your plan below. We&rsquo;ll save your payment info now, but you won&rsquo;t be charged anything until you get matched with your first creative. Browse and post freely in the meantime — it&rsquo;s completely free until it actually works for you.
      </p>
      <div className="mt-6">
        <PlanCard plan={plan} label={PLAN_LABELS[plan]} blurb={p.blurb} features={p.features}
          monthly={p.monthly} annual={p.annual} annualSavingsLabel={p.annualSavingsLabel}
          current={false} highlight />
      </div>
    </div>
  );
}
