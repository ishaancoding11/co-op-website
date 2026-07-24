'use client';

import { useActionState, useState } from 'react';
import { submitReview } from '@/lib/actions';
import { inputCls } from '@/components/ui';

export function ReviewForm({ agreementId, revieweeId, revieweeName }: { agreementId: string; revieweeId: string; revieweeName: string }) {
  const [state, action, pending] = useActionState(submitReview, {});
  const [stars, setStars] = useState(5);
  return (
    <form action={action} className="space-y-4 mt-3">
      <input type="hidden" name="agreement_id" value={agreementId} />
      <input type="hidden" name="reviewee_id" value={revieweeId} />
      <input type="hidden" name="stars" value={stars} />
      <div role="radiogroup" aria-label={`Rate ${revieweeName} out of 5 stars`} className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => setStars(n)}
            className={`text-3xl transition-transform hover:scale-110 ${n <= stars ? 'text-gold' : 'text-line'}`}>★</button>
        ))}
      </div>
      <textarea name="body" rows={3} className={inputCls} placeholder={`How was working with ${revieweeName}?`} />
      {state?.error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2.5">{state.error}</p>}
      <button disabled={pending} className="rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-medium hover:opacity-85 disabled:opacity-40">
        {pending ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  );
}
