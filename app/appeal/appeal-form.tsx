'use client';

import { useActionState } from 'react';
import { submitBanAppeal } from '@/lib/appeal-actions';
import { inputCls } from '@/components/ui';

export function AppealForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action, pending] = useActionState(submitBanAppeal, {});

  if (state?.ok) {
    return (
      <p className="text-sm text-sea">
        Thanks — we’ve received your appeal and will review it. You won’t be able to submit another for this ban.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3 text-left">
      <label className="block">
        <span className="block text-sm font-medium mb-1.5">Email your account used</span>
        <input required type="email" name="email" defaultValue={defaultEmail} className={inputCls} />
      </label>
      <label className="block">
        <span className="block text-sm font-medium mb-1.5">Explain why you think this was a mistake</span>
        <textarea required name="message" rows={5} maxLength={4000} className={inputCls}
          placeholder="What happened, and why you believe the ban shouldn't stand." />
      </label>
      {state?.error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2.5">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-full bg-foreground text-background py-3 text-sm font-medium hover:opacity-85 disabled:opacity-40">
        {pending ? 'Submitting…' : 'Submit appeal'}
      </button>
      <p className="text-xs text-muted text-center">You can only submit one appeal per ban.</p>
    </form>
  );
}
