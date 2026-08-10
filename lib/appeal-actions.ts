'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

/**
 * Unauthenticated on purpose — a banned account has no session to attach
 * this to. submit_ban_appeal() (0017_ban_appeals.sql) does the real
 * validation (is this email actually banned, has it already appealed this
 * ban cycle); this is just the argument list and friendly error text.
 */
export async function submitBanAppeal(prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const email = ((formData.get('email') as string) || '').trim();
  const message = ((formData.get('message') as string) || '').trim();
  if (!email) return { error: 'Enter the email your account used.' };
  if (!message) return { error: 'Tell us why you think this was a mistake.' };

  const { error } = await supabase.rpc('submit_ban_appeal', { p_email: email, p_message: message });
  if (error) {
    if (error.message.includes('NOT_BANNED')) return { error: 'That email doesn’t match a currently banned account.' };
    if (error.message.includes('ALREADY_SUBMITTED')) return { error: 'You’ve already submitted an appeal for this ban — our team has received it.' };
    if (error.message.includes('INVALID_EMAIL')) return { error: 'Enter a valid email.' };
    return { error: 'Could not submit your appeal. Try again in a moment.' };
  }
  return { ok: true };
}
