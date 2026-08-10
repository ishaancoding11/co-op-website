'use client';

import { useActionState, useState } from 'react';
import { startSubscriptionCheckout, requestManualSubscription } from '@/lib/billing-actions';
import type { SubscriptionPlan } from '@/lib/plans';
import { formatMoney, type Currency } from '@/lib/types';

export function PlanCard({ plan, label, blurb, features, monthly, annual, annualSavingsLabel, current, highlight, currency, monthlyKzt, annualKzt, labels }: {
  plan: SubscriptionPlan; label: string; blurb: string; features: string[];
  monthly: number; annual: number | null; annualSavingsLabel: string | null;
  current: boolean; highlight?: boolean;
  currency: Currency;
  monthlyKzt: number; annualKzt: number | null;
  labels: { choose: string; opening: string; currentPlan: string; monthly: string; annual: string; requestPlan: string; requesting: string; requested: string; billedYearly: string; kztNotice: string };
}) {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
  const [state, action, pending] = useActionState(startSubscriptionCheckout, {});
  const [manualState, manualAction, manualPending] = useActionState(requestManualSubscription, {});

  const isKzt = currency === 'KZT';
  // KZT settles through the manual (Kaspi/bank) lane, so tenge cards only offer
  // intervals that plan_limits actually prices in KZT (annual may be absent).
  const kztAnnualAvailable = annualKzt != null;
  const effInterval = isKzt && interval === 'annual' && !kztAnnualAvailable ? 'monthly' : interval;

  const priceLabel = isKzt
    ? formatMoney(effInterval === 'annual' && annualKzt != null ? Math.round(annualKzt / 12) : monthlyKzt, 'KZT')
    : `$${effInterval === 'annual' && annual != null ? (annual / 12).toFixed(2) : monthly.toFixed(2)}`;
  const showToggle = isKzt ? kztAnnualAvailable : annual != null;

  return (
    <div className={`rounded-3xl border p-6 flex flex-col ${highlight ? 'border-accent shadow-[var(--shadow-md)]' : 'border-line'} ${current ? 'bg-sea-soft/40' : 'bg-card'}`}>
      {highlight && <span className="self-start rounded-full bg-accent text-white text-xs font-semibold px-2.5 py-0.5 mb-3">Most popular</span>}
      <h3 className="font-display text-2xl">{label}</h3>
      <p className="text-sm text-muted mt-1">{blurb}</p>

      <div className="mt-4">
        <p className="font-display text-3xl">{priceLabel}<span className="text-sm text-muted font-sans"> /mo</span></p>
        {showToggle && (
          <div className="flex items-center gap-2 mt-2">
            <div role="radiogroup" className="inline-flex rounded-full border border-line p-0.5 text-xs">
              <button type="button" onClick={() => setInterval('monthly')}
                className={`rounded-full px-3 py-1 font-medium ${effInterval === 'monthly' ? 'bg-foreground text-background' : 'text-muted'}`}>{labels.monthly}</button>
              <button type="button" onClick={() => setInterval('annual')}
                className={`rounded-full px-3 py-1 font-medium ${effInterval === 'annual' ? 'bg-foreground text-background' : 'text-muted'}`}>{labels.annual}</button>
            </div>
          </div>
        )}
        {!isKzt && effInterval === 'annual' && annualSavingsLabel && <p className="text-xs text-sea font-medium mt-1.5">{annualSavingsLabel}</p>}
        {effInterval === 'annual' && (isKzt ? annualKzt != null : annual != null) && (
          <p className="text-xs text-muted">{isKzt ? formatMoney(annualKzt as number, 'KZT') : `$${(annual as number).toFixed(2)}`} {labels.billedYearly}</p>
        )}
      </div>

      <ul className="text-sm text-muted mt-4 space-y-1.5 flex-1">
        {features.map(f => <li key={f} className="flex gap-2"><span className="text-sea" aria-hidden>✓</span>{f}</li>)}
      </ul>

      {current ? (
        <p className="mt-5 text-center text-sm font-medium text-sea rounded-full border border-sea/30 py-2.5">{labels.currentPlan}</p>
      ) : isKzt ? (
        manualState?.requested ? (
          <p className="mt-5 text-center text-sm font-medium text-sea rounded-full border border-sea/30 py-2.5">{labels.requested}</p>
        ) : (
          <form action={manualAction} className="mt-5">
            <input type="hidden" name="plan" value={plan} />
            <input type="hidden" name="interval" value={effInterval} />
            <button disabled={manualPending} className={`w-full rounded-full py-2.5 text-sm font-medium active:scale-[0.97] hover:opacity-90 transition-[transform,opacity] duration-200 ease-[var(--ease-out)] disabled:opacity-40 ${highlight ? 'bg-accent text-white' : 'bg-foreground text-background'}`}>
              {manualPending ? labels.requesting : labels.requestPlan}
            </button>
            <p className="text-xs text-muted mt-2">{labels.kztNotice}</p>
            {manualState?.error && <p role="alert" className="text-xs text-red-700 mt-2 text-center">{manualState.error}</p>}
          </form>
        )
      ) : (
        <form action={action} className="mt-5">
          <input type="hidden" name="plan" value={plan} />
          <input type="hidden" name="interval" value={effInterval} />
          <button disabled={pending} className={`w-full rounded-full py-2.5 text-sm font-medium active:scale-[0.97] hover:opacity-90 transition-[transform,opacity] duration-200 ease-[var(--ease-out)] disabled:opacity-40 ${highlight ? 'bg-accent text-white' : 'bg-foreground text-background'}`}>
            {pending ? labels.opening : `${labels.choose} ${label}`}
          </button>
          {state?.error && <p role="alert" className="text-xs text-red-700 mt-2 text-center">{state.error}</p>}
        </form>
      )}
    </div>
  );
}
