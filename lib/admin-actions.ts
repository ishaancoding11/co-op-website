'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

/**
 * Every write here is a thin wrapper around a security-definer RPC
 * (admin_set_account_status / admin_resolve_report / admin_remove_job) that
 * re-derives staff status from auth.uid() itself and refuses anyone who isn't
 * staff — none of that is re-checked here, because a copy of the rule is a
 * chance for the copy to drift. This file is the argument list, not the policy.
 *
 * Plain server actions, no client JavaScript required — a moderation tool
 * that needs JS to work is a moderation tool that stops working on the
 * machine of whoever is on call at 2am.
 */

async function db() {
  const cookieStore = await cookies();
  return { supabase: createClient(cookieStore) };
}

/**
 * Success feedback for the Users page's account actions: redirect back to
 * wherever the admin was (kind/q/page preserved via hidden form fields) with
 * a notice the page renders as a banner. No client JS — the redirect itself
 * is the confirmation that the action went through, same as a plain link.
 */
function usersRedirect(notice: string, form: FormData, target?: string | null) {
  const sp = new URLSearchParams();
  const kind = form.get('kind') as string | null;
  const q = form.get('q') as string | null;
  const page = form.get('page') as string | null;
  if (kind) sp.set('kind', kind);
  if (q) sp.set('q', q);
  if (page) sp.set('page', page);
  sp.set('notice', notice);
  if (target) sp.set('target', target);
  redirect(`/admin/users?${sp.toString()}`);
}

export async function setAccountStatus(formData: FormData): Promise<void> {
  const { supabase } = await db();
  const userId = formData.get('userId') as string;
  const status = formData.get('status') as string;
  const reason = formData.get('reason') as string;
  const target = formData.get('target') as string | null;
  if (!userId || (status !== 'active' && status !== 'suspended') || !reason?.trim()) return;

  await supabase.rpc('admin_set_account_status', { p_user: userId, p_status: status, p_reason: reason });
  revalidatePath('/admin/users');
  usersRedirect(status === 'suspended' ? 'suspended' : 'reinstated', formData, target);
}

export async function resolveReport(reportId: string, status: 'resolved' | 'dismissed') {
  const { supabase } = await db();
  await supabase.rpc('admin_resolve_report', { p_report: reportId, p_status: status });
  revalidatePath('/admin/reports');
}

export async function removeJob(formData: FormData): Promise<void> {
  const { supabase } = await db();
  const jobId = formData.get('jobId') as string;
  const reason = formData.get('reason') as string;
  if (!jobId || !reason?.trim()) return;

  await supabase.rpc('admin_remove_job', { p_job: jobId, p_reason: reason });
  revalidatePath('/admin/jobs');
}

export async function deleteAndBanUser(formData: FormData): Promise<void> {
  const { supabase } = await db();
  const userId = formData.get('userId') as string;
  const reason = formData.get('reason') as string;
  const target = formData.get('target') as string | null;
  if (!userId || !reason?.trim()) return;

  await supabase.rpc('admin_delete_and_ban_user', { p_user: userId, p_reason: reason });
  revalidatePath('/admin/users');
  revalidatePath('/admin/users?kind=banned');
  usersRedirect('banned', formData, target);
}

export async function unbanEmail(formData: FormData): Promise<void> {
  const { supabase } = await db();
  const email = formData.get('email') as string;
  const reason = formData.get('reason') as string;
  if (!email) return;

  await supabase.rpc('admin_unban_email', { p_email: email, p_reason: reason || null });
  revalidatePath('/admin/users?kind=banned');
  redirect(`/admin/users?kind=banned&notice=unbanned&target=${encodeURIComponent(email)}`);
}

export async function resolveSupportTicket(ticketId: string, status: 'resolved' | 'dismissed') {
  const { supabase } = await db();
  await supabase.rpc('admin_resolve_support_ticket', { p_ticket: ticketId, p_status: status });
  revalidatePath('/admin/support');
}

export async function resolveBanAppeal(appealId: string, status: 'resolved' | 'dismissed') {
  const { supabase } = await db();
  await supabase.rpc('admin_resolve_ban_appeal', { p_appeal: appealId, p_status: status });
  revalidatePath('/admin/users?kind=banned');
}
