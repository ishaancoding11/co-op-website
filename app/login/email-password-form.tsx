'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();

      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
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
