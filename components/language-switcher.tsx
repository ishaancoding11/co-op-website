'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n';
import { setLocale } from '@/lib/i18n-actions';

/** A native <select> on purpose: no popover state, no focus trap, works before
 *  hydration, and re-renders the (server) tree via router.refresh() once the
 *  locale cookie is set. */
export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label={label}
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as Locale;
        startTransition(async () => {
          await setLocale(next);
          router.refresh();
        });
      }}
      className="rounded-full border border-line bg-card px-2.5 py-1 text-sm text-muted hover:text-foreground focus:outline-none focus:border-accent disabled:opacity-60"
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
      ))}
    </select>
  );
}
