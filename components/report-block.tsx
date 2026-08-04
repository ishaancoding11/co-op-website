'use client';

import { useActionState, useState, useTransition } from 'react';
import { reportUser, blockUser } from '@/lib/actions';
import { inputCls } from './ui';
import { Dropdown } from './dropdown';

export function ReportBlock({ targetUserId, targetName, path }: { targetUserId: string; targetName: string; path: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(reportUser, {});
  const [, startTransition] = useTransition();
  const [blocked, setBlocked] = useState(false);

  return (
    <div className="mt-12 border-t border-line pt-4 text-xs text-muted flex flex-wrap gap-4 items-start">
      <button onClick={() => setOpen(o => !o)} className="underline underline-offset-2 hover:text-foreground">Report {targetName}</button>
      <button disabled={blocked} onClick={() => { setBlocked(true); startTransition(() => blockUser(targetUserId, path)); }}
        className="underline underline-offset-2 hover:text-foreground disabled:no-underline disabled:cursor-default">
        {blocked ? 'Blocked — you won’t see each other anymore' : `Block ${targetName}`}
      </button>
      {open && !state?.ok && (
        <form action={action} className="w-full max-w-sm space-y-2 mt-2">
          <input type="hidden" name="reported_user_id" value={targetUserId} />
          <Dropdown name="reason" ariaLabel="Reason" options={[
            { value: 'Spam or scam', label: 'Spam or scam' },
            { value: 'Inappropriate content', label: 'Inappropriate content' },
            { value: 'Harassment', label: 'Harassment' },
            { value: 'Impersonation', label: 'Impersonation' },
            { value: 'Other', label: 'Other' },
          ]} />
          <textarea name="details" rows={2} className={inputCls} placeholder="Anything else we should know (optional)" />
          <button disabled={pending} className="rounded-full bg-foreground text-background px-4 py-2 font-medium">Submit report</button>
        </form>
      )}
      {state?.ok && <p className="w-full text-sea">Thanks — our team will review this report.</p>}
    </div>
  );
}
