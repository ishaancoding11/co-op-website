'use client';

import { useActionState, useState } from 'react';
import { deleteAccount } from '@/lib/actions';
import { inputCls } from '@/components/ui';

export function DeleteAccount() {
  const [armed, setArmed] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, {});

  if (!armed) {
    return (
      <button onClick={() => setArmed(true)}
        className="rounded-full border border-red-200 bg-red-50 text-red-700 px-5 py-2 text-sm font-medium hover:bg-red-100">
        Delete account…
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-red-700 font-medium">Are you sure? This permanently deletes your profile, matches, messages, jobs, reviews, and portfolio. It cannot be undone.</p>
      <label className="block">
        <span className="block text-xs text-muted mb-1.5">Type <strong className="text-foreground">DELETE</strong> to confirm</span>
        <input name="confirmation" autoComplete="off" className={inputCls} placeholder="DELETE" />
      </label>
      {state?.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending}
          className="rounded-full bg-red-600 text-white px-5 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-40">
          {pending ? 'Deleting…' : 'Permanently delete my account'}
        </button>
        <button type="button" onClick={() => setArmed(false)}
          className="rounded-full border border-line px-5 py-2 text-sm font-medium hover:bg-background">
          Cancel
        </button>
      </div>
    </form>
  );
}
