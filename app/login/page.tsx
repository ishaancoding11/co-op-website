import Link from 'next/link';
import { Card } from '@/components/ui';
import { GoogleButton } from './google-button';
import { EmailPasswordForm } from './email-password-form';

export default async function Login({ searchParams }: { searchParams: Promise<{ role?: string; next?: string; gate?: string; mode?: string; blocked?: string }> }) {
  const { role, next, gate, mode, blocked } = await searchParams;
  // Arriving with a role (from a "Get started as…" button) defaults to signup;
  // arriving from the nav's plain "Log in" defaults to login.
  const initialMode = mode === 'signup' || mode === 'login' ? mode : role ? 'signup' : 'login';

  return (
    <div className="py-20 max-w-sm mx-auto">
      <Card className="p-8 text-center">
        <h1 className="font-display text-3xl">Welcome to Co-op</h1>
        {gate === 'creative-limit' ? (
          <p className="text-muted text-sm mt-2">
            You&rsquo;ve viewed your one free creative profile as a guest. Sign in free to browse every local creative.
          </p>
        ) : (
          <p className="text-muted text-sm mt-2">
            {initialMode === 'login'
              ? 'Log in to your Co-op account.'
              : role === 'business' ? 'Sign in to find and book local creatives.' : 'Sign in to get discovered and land local gigs.'}
          </p>
        )}
        {blocked === '1' && (
          // Deliberately hedged copy: this fires for any failed Google sign-in
          // (expired code, a cancelled consent screen, etc.), not only a
          // banned email — the callback route has no way to tell those apart,
          // since a blocked signup never gets far enough to have a user row
          // to inspect. Asserting "you were banned" here would be wrong most
          // of the time this actually fires.
          <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2.5 mt-3">
            We couldn&rsquo;t sign you in with Google. If you believe your account was removed in error, you can{' '}
            <Link href="/appeal" className="underline underline-offset-2 font-medium">submit an appeal</Link>.
          </p>
        )}
        <div className="mt-6">
          <GoogleButton role={role} next={next} />
        </div>
        <div className="flex items-center gap-3 my-5" aria-hidden>
          <span className="h-px flex-1 bg-line" /><span className="text-xs text-muted">or</span><span className="h-px flex-1 bg-line" />
        </div>
        <EmailPasswordForm role={role} next={next} initialMode={initialMode} />
        <p className="text-xs text-muted mt-6">Your account is either a creative or a business — pick the side that fits, it&rsquo;s set at signup.</p>
      </Card>
    </div>
  );
}
