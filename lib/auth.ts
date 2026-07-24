import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import type { BusinessProfile, CreativeProfile } from './types';

export async function getSession() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user, cookieStore };
}

export type Viewer = {
  userId: string | null;
  creative: CreativeProfile | null;
  business: BusinessProfile | null;
  activeRole: 'creative' | 'business' | null;
};

// Role = which profile rows exist; active side is a cookie, switchable in Settings.
export async function getViewer(): Promise<Viewer & { supabase: Awaited<ReturnType<typeof getSession>>['supabase'] }> {
  const { supabase, user, cookieStore } = await getSession();
  if (!user) return { userId: null, creative: null, business: null, activeRole: null, supabase };
  const [{ data: creative }, { data: business }] = await Promise.all([
    supabase.from('creative_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('business_profiles').select('*').eq('user_id', user.id).maybeSingle(),
  ]);
  const pref = cookieStore.get('coop_role')?.value;
  let activeRole: Viewer['activeRole'] = null;
  if (pref === 'creative' && creative) activeRole = 'creative';
  else if (pref === 'business' && business) activeRole = 'business';
  else if (creative) activeRole = 'creative';
  else if (business) activeRole = 'business';
  else if (pref === 'creative' || pref === 'business') activeRole = pref; // mid-onboarding
  return { userId: user.id, creative, business, activeRole, supabase };
}
