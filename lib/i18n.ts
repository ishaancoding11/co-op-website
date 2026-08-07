// Client-safe i18n primitives: the locale set, display labels, and the cookie
// name. Deliberately free of `next/headers` and the message dictionaries so it
// can be imported from client components (the language switcher) without
// pulling server-only code or the full translation payload into the browser
// bundle. Server-side translation lives in lib/i18n-server.ts.

export type Locale = 'en' | 'ru';

export const LOCALES: Locale[] = ['en', 'ru'];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
};

export const LOCALE_COOKIE = 'coop_locale';

export function isLocale(value: string | undefined | null): value is Locale {
  return value === 'en' || value === 'ru';
}
