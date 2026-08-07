import { Card } from '@/components/ui';
import { GoogleButton } from './google-button';
import { EmailPasswordForm } from './email-password-form';

export default async function Login({ searchParams }: { searchParams: Promise<{ role?: string; next?: string; gate?: string; mode?: string }> }) {
  const { role, next, gate, mode } = await searchParams;
  // Arriving with a role (from a "Get started as…" button) defaults to signup;
  // arriving from the nav's plain "Log in" defaults to login.
  const initialMode = mode === 'signup' || mode === 'login' ? mode : role ? 'signup' : 'login';

  return (
    <div className="py-20 max-w-sm mx-auto">
      <Card className="p-8 text-center">
        <img src="/coop-wordmark.png" alt="Co-op" width={72} height={72} className="mx-auto rounded-xl shadow-[var(--shadow-sm)]" />
        <h1 className="font-display text-3xl mt-4">Welcome to Co-op</h1>
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
