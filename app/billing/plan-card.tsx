'use client';

import { useActionState, useState } from 'react';
import { startSubscriptionCheckout } from '@/lib/billing-actions';
import type { SubscriptionPlan } from '@/lib/plans';

export function PlanCard({ plan, label, blurb, features, monthly, annual, annualSavingsLabel, current, highlight }: {
  plan: SubscriptionPlan; label: string; blurb: string; features: string[];
  monthly: number; annual: number | null; annualSavingsLabel: string | null;
  current: boolean; highlight?: boolean;
}) {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
  const [state, action, pending] = useActionState(startSubscriptionCheckout, {});

  return (
    <div className={`rounded-3xl border p-6 flex flex-col ${highlight ? 'border-accent shadow-[0_8px_30px_rgba(45,42,38,0.1)]' : 'border-line'} ${current ? 'bg-sea-soft/40' : 'bg-card'}`}>
      {highlight && <span className="self-start rounded-full bg-accent text-white text-xs font-semibold px-2.5 py-0.5 mb-3">Most popular</span>}
      <h3 className="font-display text-2xl">{label}</h3>
      <p className="text-sm text-muted mt-1">{blurb}</p>

      <div className="mt-4">
        <p className="font-display text-3xl">${interval === 'annual' && annual != null ? (annual / 12).toFixed(2) : monthly.toFixed(2)}<span className="text-sm text-muted font-sans"> /mo</span></p>
        {annual != null && (
          <div className="flex items-center gap-2 mt-2">
            <div role="radiogroup" className="inline-flex rounded-full border border-line p-0.5 text-xs">
              <button type="button" onClick={() => setInterval('monthly')}
                className={`rounded-full px-3 py-1 font-medium ${interval === 'monthly' ? 'bg-foreground text-background' : 'text-muted'}`}>Monthly</button>
              <button type="button" onClick={() => setInterval('annual')}
                className={`rounded-full px-3 py-1 font-medium ${interval === 'annual' ? 'bg-foreground text-background' : 'text-muted'}`}>Annual</button>
            </div>
          </div>
        )}
        {interval === 'annual' && annualSavingsLabel && <p className="text-xs text-accent font-medium mt-1.5">{annualSavingsLabel}</p>}
        {interval === 'annual' && annual != null && <p className="text-xs text-muted">${annual.toFixed(2)} billed yearly</p>}
      </div>

      <ul className="text-sm text-muted mt-4 space-y-1.5 flex-1">
        {features.map(f => <li key={f} className="flex gap-2"><span className="text-accent" aria-hidden>✓</span>{f}</li>)}
      </ul>

      {current ? (
        <p className="mt-5 text-center text-sm font-medium text-sea rounded-full border border-sea/30 py-2.5">Your current plan</p>
      ) : (
        <form action={action} className="mt-5">
          <input type="hidden" name="plan" value={plan} />
          <input type="hidden" name="interval" value={interval} />
          <button disabled={pending} className={`w-full rounded-full py-2.5 text-sm font-medium hover:opacity-85 disabled:opacity-40 ${highlight ? 'bg-accent text-white' : 'bg-foreground text-background'}`}>
            {pending ? 'Opening checkout…' : `Choose ${label}`}
          </button>
          {state?.error && <p role="alert" className="text-xs text-red-700 mt-2 text-center">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
