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

  let dest = '/';
  if (role === 'creative') dest = creative ? '/jobs' : '/onboarding/creative';
  else if (role === 'business') dest = business ? '/discover' : '/onboarding/business';
  else if (creative) dest = '/jobs';
  else if (business) dest = '/discover';

  const res = NextResponse.redirect(new URL(dest, url.origin));
  if (role === 'creative' || role === 'business') res.cookies.set('coop_role', role, { path: '/', maxAge: 60 * 60 * 24 * 365 });
  return res;
}
