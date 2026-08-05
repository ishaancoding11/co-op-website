'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

/**
 * Raising a support ticket. Thin wrapper over the create_support_ticket RPC,
 * which validates the fields and stamps the row with auth.uid() itself — so the
 * ticket can't be filed on someone else's behalf and the subject/body rules live
 * in one place (the database), not here.
 */
export async function createSupportTicket(prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in to contact support.' };

  const subject = ((formData.get('subject') as string) || '').trim();
  const body = ((formData.get('body') as string) || '').trim();
  if (!subject) return { error: 'Add a subject.' };
  if (!body) return { error: 'Tell us what’s going on.' };

  const { error } = await supabase.rpc('create_support_ticket', { p_subject: subject, p_body: body });
  if (error) return { error: 'Could not send your message. Try again in a moment.' };
  revalidatePath('/support');
  return { ok: true };
}
