'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export const OPEN_GATE_EVENT = 'coop:open-gate';

// Pages where the gate must never block (the signup/confirm flows themselves)
const EXEMPT = [/^\/login/, /^\/verify\//, /^\/auth\//];

export function SignupGate() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const exempt = EXEMPT.some(re => re.test(pathname));

  // Scroll trigger — every page, every visit; no dismissal escape hatch.
  useEffect(() => {
    if (exempt || open) return;
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const threshold = Math.max(80, Math.min(350, scrollable * 0.6));
      if (window.scrollY > threshold) {
        setOpen(true);
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [exempt, open, pathname]);

  // "Get started" buttons anywhere can open the gate directly.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_GATE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GATE_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || exempt) return null;

  const go = (role: 'business' | 'creative') => {
    setOpen(false);
    router.push(`/login?role=${role}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-foreground/30 backdrop-blur-md"
      role="dialog" aria-modal="true" aria-label="Create a free Co-op account">
      <div className="bg-card rounded-3xl border border-line shadow-[0_16px_60px_rgba(45,42,38,0.25)] p-8 max-w-md w-full text-center">
        <img src="/coop-logo-icon.svg" alt="" width={44} height={44} className="mx-auto rounded-xl" />
        <h2 className="font-display text-2xl mt-4">Find your local creative match</h2>
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
      </div>
    </div>
  );
}
