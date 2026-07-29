import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const role = url.searchParams.get('role');
  const next = url.searchParams.get('next');
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  if (code) await supabase.auth.exchangeCodeForSession(code);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', url.origin));
  if (next) return NextResponse.redirect(new URL(next, url.origin));

  const [{ data: creative }, { data: business }] = await Promise.all([
    supabase.from('creative_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('business_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
  ]);

  // Roles are locked at signup: an existing profile always wins over the
  // requested role param, so nobody can onboard into the other side.
  let dest = '/';
  let effectiveRole = role;
  if (creative) { dest = '/jobs'; effectiveRole = 'creative'; }
  else if (business) { dest = '/browse'; effectiveRole = 'business'; }
  else if (role === 'creative') dest = '/onboarding/creative';
  else if (role === 'business') dest = '/onboarding/business';

  const res = NextResponse.redirect(new URL(dest, url.origin));
  if (effectiveRole === 'creative' || effectiveRole === 'business') {
    res.cookies.set('coop_role', effectiveRole, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  }
  return res;
}
