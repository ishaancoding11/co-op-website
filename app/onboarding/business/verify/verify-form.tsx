'use client';

import { useActionState } from 'react';
import { startVerification } from '@/lib/actions';
import { inputCls } from '@/components/ui';
import { LineIcon } from '@/components/line-icons';

export function VerifyForm() {
  const [state, action, pending] = useActionState(startVerification, {});
  if (state?.sent) {
    return (
      <div className="text-center py-6">
        <span className="mx-auto grid place-items-center h-11 w-11 rounded-2xl bg-sea-soft text-sea" aria-hidden><LineIcon name="mail" size={22} /></span>
        <p className="font-medium mt-3">Check your inbox</p>
        <p className="text-sm text-muted mt-1">We sent a confirmation link. Click it and your verified badge appears everywhere.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="block text-sm font-medium mb-1.5">Business email</span>
        <input required type="email" name="email" className={inputCls} placeholder="you@yourbusiness.com" />
      </label>
      {state?.error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2.5">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-full bg-foreground text-background py-3 text-sm font-medium active:scale-[0.97] hover:opacity-90 transition-[transform,opacity] duration-200 ease-[var(--ease-out)] disabled:opacity-40">
        {pending ? 'Sending…' : 'Send verification link'}
      </button>
    </form>
  );
}
