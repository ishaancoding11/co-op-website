import 'server-only';

import { cookies, headers } from 'next/headers';
import en from '@/messages/en.json';
import ru from '@/messages/ru.json';
import kk from '@/messages/kk.json';
import { type Locale, LOCALE_COOKIE, isLocale } from '@/lib/i18n';

// A cookie-based, route-agnostic i18n reader. It intentionally does NOT push
// locale into the URL (no /[locale] segment), because every route in this app
// is flat and moving them all under a locale segment would be a large,
// risky change on a live deployment for no user-visible gain. The trade-off:
// pages that read the locale are dynamic (they touch cookies), which they
// already are here.

const DICTIONARIES: Record<Locale, Record<string, unknown>> = { en, ru, kk };

/** cookie → Accept-Language → English. */
export async function getLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const accept = (await headers()).get('accept-language') ?? '';
  const first = accept.split(',')[0]?.trim().slice(0, 2).toLowerCase();
  if (isLocale(first)) return first;

  return 'en';
}

function lookup(dict: Record<string, unknown>, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>(
    (acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined),
    dict,
  );
  return typeof value === 'string' ? value : undefined;
}

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** Missing keys fall back to English, then to the key itself — so a partially
 *  translated locale degrades to readable English rather than blank UI. */
export function translator(locale: Locale): Translate {
  return (key, vars) => {
    const raw = lookup(DICTIONARIES[locale], key) ?? lookup(DICTIONARIES.en, key) ?? key;
    return vars ? raw.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`)) : raw;
  };
}

export async function getT(): Promise<{ locale: Locale; t: Translate }> {
  const locale = await getLocale();
  return { locale, t: translator(locale) };
}
