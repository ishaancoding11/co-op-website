'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from './ui';
import { signOut } from '@/lib/actions';
import { setLocale } from '@/lib/i18n-actions';
import { LOCALES, type Locale } from '@/lib/i18n';

export type YouMenuItem = { href: string; label: string; icon?: ReactNode };

/** One popover component that serves both the desktop top-right avatar and the
 *  mobile bottom-nav "You" tab. Positioning flips based on `variant`, so the
 *  same menu opens above the bottom tab bar on mobile and below the avatar on
 *  desktop. */
export function YouMenu({
  displayName, avatarUrl, items, locale, langLabel, signOutLabel, variant,
}: {
  displayName: string;
  avatarUrl: string | null | undefined;
  items: YouMenuItem[];
  locale: Locale;
  langLabel: string;
  signOutLabel: string;
  variant: 'desktop' | 'mobile';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const pickLocale = (next: Locale) => {
    if (next === locale) return;
    startTransition(async () => { await setLocale(next); router.refresh(); });
  };

  const trigger = variant === 'desktop' ? (
    <button
      ref={triggerRef} type="button" aria-haspopup="menu" aria-expanded={open}
      aria-label={displayName}
      onClick={() => setOpen(o => !o)}
      className={`ml-1.5 rounded-full ring-2 transition-shadow shrink-0 focus:outline-none focus:ring-accent ${open ? 'ring-accent' : 'ring-line hover:ring-accent'}`}
    >
      <Avatar name={displayName} url={avatarUrl} size={34} />
    </button>
  ) : (
    <button
      ref={triggerRef} type="button" aria-haspopup="menu" aria-expanded={open}
      aria-label={displayName}
      onClick={() => setOpen(o => !o)}
      className={`flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-1 text-[11px] font-semibold transition-colors ${open ? 'text-accent bg-accent-soft' : 'text-muted hover:text-foreground'}`}
    >
      <span className={`rounded-full ring-2 ${open ? 'ring-accent' : 'ring-transparent'}`}>
        <Avatar name={displayName} url={avatarUrl} size={24} />
      </span>
      <span>{displayName.length > 8 ? 'You' : displayName.split(' ')[0]}</span>
    </button>
  );

  const panelPos =
    variant === 'desktop'
      ? 'origin-top-right right-0 mt-2 top-full'
      : 'origin-bottom-right right-2 bottom-full mb-2';

  return (
    <div ref={rootRef} className="relative">
      {trigger}
      {open && (
        <div role="menu" aria-label={displayName}
          className={`animate-pop absolute z-50 w-64 rounded-2xl border border-line bg-card p-1.5 shadow-[var(--shadow-lg)] ${panelPos}`}>
          <div className="flex items-center gap-3 px-2.5 py-2.5 border-b border-line/70 mb-1">
            <Avatar name={displayName} url={avatarUrl} size={38} />
            <p className="font-semibold text-sm truncate">{displayName}</p>
          </div>
          {items.map(it => (
            <Link key={it.href} href={it.href} role="menuitem" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-sea-soft transition-colors">
              {it.icon && <span className="text-muted shrink-0">{it.icon}</span>}
              <span className="truncate">{it.label}</span>
            </Link>
          ))}
          <div className="border-t border-line/70 mt-1 pt-1.5 px-2.5 pb-1 flex items-center gap-1.5">
            <span className="text-[11px] text-muted mr-auto uppercase tracking-wide">{langLabel}</span>
            {LOCALES.map(l => (
              <button key={l} type="button" onClick={() => pickLocale(l)} disabled={pending}
                aria-pressed={l === locale}
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${l === locale ? 'bg-accent-soft text-accent' : 'text-muted hover:text-foreground'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <form action={signOut}>
            <button type="submit"
              className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-left text-muted hover:bg-accent-soft hover:text-accent transition-colors mt-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
              </svg>
              {signOutLabel}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
