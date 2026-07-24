'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const DISMISS_KEY = 'coop_gate_dismissed';

export function SignupGate() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    const onScroll = () => {
      // Adaptive threshold: 350px, or 60% of whatever scroll room the page has
      // (min 80px), so short pages can still trigger it.
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const threshold = Math.max(80, Math.min(350, scrollable * 0.6));
      if (window.scrollY > threshold) {
        setOpen(true);
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
  };
  const go = (role: 'business' | 'creative') => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    router.push(`/login?role=${role}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-foreground/30 backdrop-blur-md"
      role="dialog" aria-modal="true" aria-label="Create a free Co-op account">
      <div className="bg-card rounded-3xl border border-line shadow-[0_16px_60px_rgba(45,42,38,0.25)] p-8 max-w-md w-full text-center relative">
        <button onClick={dismiss} aria-label="Not now — keep browsing"
          className="absolute top-4 right-4 h-8 w-8 rounded-full text-muted hover:bg-line/60 hover:text-foreground">✕</button>
        <img src="/coop-logo-icon.svg" alt="" width={44} height={44} className="mx-auto rounded-xl" />
        <h2 className="font-display text-2xl mt-4">Liking what you see?</h2>
        <p className="text-sm text-muted mt-2">
          Join Co-op free to see every local creative and job, match, and message directly. No fees, ever.
        </p>
        <div className="mt-6 space-y-2.5">
          <button onClick={() => go('business')}
            className="w-full rounded-full bg-accent text-white py-3 text-sm font-medium hover:opacity-85">
            Get started as a business
          </button>
          <button onClick={() => go('creative')}
            className="w-full rounded-full bg-foreground text-background py-3 text-sm font-medium hover:opacity-85">
            Get started as a creative
          </button>
        </div>
        <button onClick={dismiss} className="text-xs text-muted underline underline-offset-2 mt-4 hover:text-foreground">
          Keep browsing for now
        </button>
      </div>
    </div>
  );
}
