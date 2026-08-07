'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

type ActionRow = { action: 'suspended' | 'reinstated' | 'banned' | 'unbanned'; reason: string | null };

const TITLE: Record<ActionRow['action'], string> = {
  suspended: 'Your account has been suspended',
  reinstated: 'Your account has been reinstated',
  banned: 'Your account has been removed',
  unbanned: 'Your account access has been restored',
};

/**
 * Mounted for every signed-in user. An admin action (suspend/reinstate/
 * ban/unban) inserts a row into account_actions, which this picks up over
 * the same realtime channel pattern as messages/thread.tsx — the popup
 * appears the instant it happens, not the next time notifications are
 * checked. Suspend and ban additionally force a sign-out once the person
 * dismisses it, since both actions revoke standing to keep using the app.
 */
export function ModerationListener({ userId }: { userId: string }) {
  const [action, setAction] = useState<ActionRow | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`account-actions-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'account_actions', filter: `user_id=eq.${userId}` },
        payload => setAction(payload.new as ActionRow))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  if (!action) return null;

  const punitive = action.action === 'suspended' || action.action === 'banned';

  const dismiss = async () => {
    if (punitive) {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
      return;
    }
    setAction(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-foreground/40 backdrop-blur-md"
      role="alertdialog" aria-modal="true" aria-label={TITLE[action.action]}>
      <div className="bg-card rounded-3xl border border-line shadow-[0_16px_60px_rgba(45,42,38,0.25)] p-8 max-w-md w-full text-center">
        <h2 className="font-display text-2xl">{TITLE[action.action]}</h2>
        {action.reason && <p className="text-sm text-muted mt-2">{action.reason}</p>}
        <button onClick={dismiss}
          className="mt-6 w-full rounded-full bg-foreground text-background py-3 text-sm font-medium hover:opacity-85">
          {punitive ? 'Sign out' : 'OK'}
        </button>
      </div>
    </div>
  );
}
