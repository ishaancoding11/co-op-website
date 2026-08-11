'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { setRole } from '@/lib/actions';
import { inputCls } from '@/components/ui';

export function EmailPasswordForm({ role, next, initialMode = 'login' }: {
  role?: string; next?: string; initialMode?: 'login' | 'signup';
}) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [banned, setBanned] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();

      if (mode === 'signup') {
        // Checked before attempting signUp() so a banned email gets a clear
        // message instead of GoTrue's generic "Database error saving new
        // user" (what the handle_new_user() trigger's block looks like from
        // here — its real reason lives only in banned_emails, staff-only).
        const { data: isBanned } = await supabase.rpc('is_email_banned', { p_email: email });
        if (isBanned) { setBanned(true); return; }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo:
              typeof window !== 'undefined'
                ? `${window.location.origin}/auth/callback`
                : undefined,
          },
        });
        if (signUpError) { setError(signUpError.message); return; }
        if (!data.session) {
          // Email confirmation is required by this project's Auth settings.
          setCheckEmail(true);
          return;
        }
        const chosenRole = (role === 'business' || role === 'creative') ? role : 'creative';
        await setRole(chosenRole);
        router.push(next || `/onboarding/${chosenRole}`);
        router.refresh();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        // Same message whether the password is wrong or no account exists at
        // all for this email — distinguishing the two would let this form be
        // used to enumerate registered emails.
        setError("We couldn't sign you in with that email and password.");
        return;
      }
      router.push(next || '/');
      router.refresh();
    });
  };

  if (checkEmail) {
    return (
      <div className="text-center py-4">
        <p className="text-2xl" aria-hidden>📬</p>
        <p className="font-medium mt-2">Check your inbox</p>
        <p className="text-sm text-muted mt-1">We sent a confirmation link to {email}. Confirm it, then come back and log in.</p>
      </div>
    );
  }

  if (banned) {
    return (
      <div className="text-center py-4">
        <p className="text-sm">This email can’t be used to create an account.</p>
        <p className="text-sm text-muted mt-2">
          Think this was a mistake?{' '}
          <Link href={`/appeal?email=${encodeURIComponent(email)}`} className="underline underline-offset-2 font-medium">Submit an appeal</Link>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-left">
      <label className="block">
        <span className="block text-sm font-medium mb-1.5">Email</span>
        <input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
      </label>
      <label className="block">
        <span className="block text-sm font-medium mb-1.5">Password</span>
        <input required type="password" minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
      </label>
      {error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}
      <button disabled={pending} className="w-full rounded-full bg-foreground text-background py-3 text-sm font-medium hover:opacity-85 disabled:opacity-40">
        {pending ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
      </button>
      <button type="button" onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(null); }}
        className="w-full text-xs text-muted underline underline-offset-2 hover:text-foreground text-center">
        {mode === 'signup' ? 'Already have an account? Log in' : error ? 'New here? Create an account' : 'New to Co-op? Create an account'}
      </button>
    </form>
  );
}
