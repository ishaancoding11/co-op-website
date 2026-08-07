'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n';

/** Persist a language choice: a year-long cookie (read by getLocale on every
 *  request) and, if signed in, the user's stored preference so it follows them
 *  to another device. Best-effort on the DB write — the cookie is what actually
 *  drives rendering. */
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('users').update({ preferred_locale: locale }).eq('id', user.id);
  }
}
