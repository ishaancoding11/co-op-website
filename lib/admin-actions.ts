'use server';

import { revalidatePath } from 'next/cache';
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

export async function setAccountStatus(formData: FormData): Promise<void> {
  const { supabase } = await db();
  const userId = formData.get('userId') as string;
  const status = formData.get('status') as string;
  const reason = formData.get('reason') as string;
  if (!userId || (status !== 'active' && status !== 'suspended') || !reason?.trim()) return;

  await supabase.rpc('admin_set_account_status', { p_user: userId, p_status: status, p_reason: reason });
  revalidatePath('/admin/users');
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
