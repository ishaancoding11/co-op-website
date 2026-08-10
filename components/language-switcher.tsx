'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n';
import { setLocale } from '@/lib/i18n-actions';

const SHORT: Record<Locale, string> = { en: 'EN', ru: 'RU' };

function IconGlobe({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
    </svg>
  );
}

/** A fully custom locale picker (not a native <select>, which draws an
 *  un-stylable OS box). Trigger shows a globe + short code; the panel scales
 *  in from the trigger. Falls back gracefully — router.refresh() re-renders
 *  the server tree once the locale cookie is set. */
export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const pick = (next: Locale) => {
    setOpen(false);
    triggerRef.current?.focus();
    if (next === current) return;
    startTransition(async () => { await setLocale(next); router.refresh(); });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label}
        disabled={pending}
        onClick={() => setOpen(o => !o)}
        className="press inline-flex items-center gap-1.5 rounded-full border border-line bg-card/60 h-9 pl-2.5 pr-2 text-sm font-medium text-muted hover:text-foreground hover:border-line-strong focus:outline-none focus:border-accent transition-colors disabled:opacity-60"
      >
        <span className="text-muted"><IconGlobe /></span>
        <span className="tracking-wide">{SHORT[current]}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" aria-hidden
          className={`text-muted transition-transform duration-200 ease-[var(--ease-out)] ${open ? '-rotate-180' : ''}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="listbox" aria-label={label}
          className="animate-pop origin-top-right absolute right-0 z-50 mt-2 min-w-[9.5rem] rounded-2xl border border-line bg-card p-1.5 shadow-[var(--shadow-lg)]">
          {LOCALES.map(l => {
            const active = l === current;
            return (
              <button key={l} type="button" role="option" aria-selected={active}
                onClick={() => pick(l)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm text-left transition-colors ${
                  active ? 'bg-accent-soft text-accent font-medium' : 'text-foreground hover:bg-sea-soft'
                }`}>
                <span className="flex items-center gap-2.5">
                  <span className={`text-[11px] font-semibold tracking-wide ${active ? 'text-accent' : 'text-muted'}`}>{SHORT[l]}</span>
                  <span>{LOCALE_LABELS[l]}</span>
                </span>
                {active && <span aria-hidden className="shrink-0 text-accent">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
