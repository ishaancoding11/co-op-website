'use client';

import { useActionState } from 'react';
import { createSupportTicket } from '@/lib/support-actions';
import { inputCls } from '@/components/ui';

export function SupportForm() {
  const [state, action, pending] = useActionState(createSupportTicket, {});

  if (state?.ok) {
    return <p className="text-sm text-sea">Thanks — we’ve got your message and will get back to you by email.</p>;
  }

  return (
    <form action={action} className="space-y-3">
      <input name="subject" className={inputCls} placeholder="Subject" aria-label="Subject" maxLength={200} required />
      <textarea name="body" rows={5} className={inputCls} placeholder="How can we help?" aria-label="Message" maxLength={4000} required />
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-85 disabled:opacity-40">
        {pending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
