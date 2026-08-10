import { Card } from '@/components/ui';
import { GoogleButton } from './google-button';
import { EmailPasswordForm } from './email-password-form';

const VALUE_PROPS = [
  { title: '0% platform fees', body: 'Co-op never takes a cut of your work — ever.' },
  { title: 'Your neighborhood only', body: 'Match with creatives and businesses nearby.' },
  { title: 'Book directly', body: 'No middleman — you two arrange the work.' },
];

export default async function Login({ searchParams }: { searchParams: Promise<{ role?: string; next?: string; gate?: string; mode?: string }> }) {
  const { role, next, gate, mode } = await searchParams;
  // Arriving with a role (from a "Get started as…" button) defaults to signup;
  // arriving from the nav's plain "Log in" defaults to login.
  const initialMode = mode === 'signup' || mode === 'login' ? mode : role ? 'signup' : 'login';

  const subtitle = gate === 'creative-limit'
    ? 'You\u2019ve viewed your one free creative profile as a guest. Sign in free to browse every local creative.'
    : initialMode === 'login'
      ? 'Log in to your Co-op account.'
      : role === 'business' ? 'Sign in to find and book local creatives.' : 'Sign in to get discovered and land local gigs.';

  return (
    <div className="py-10 md:py-16">
      <Card className="animate-rise overflow-hidden p-0 grid lg:grid-cols-[1.05fr_1fr] shadow-[var(--shadow-lg)]">
        {/* ===== Brand panel — editorial, warm, minimal (lg only) ===== */}
        <aside className="relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-accent-soft via-background to-sea-soft/50 overflow-hidden">
          <span aria-hidden className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-sea/10 blur-3xl" />
          <div className="relative">
            <img src="/coop-wordmark.png" alt="Co-op" width={56} height={56} className="rounded-xl shadow-[var(--shadow-sm)]" />
            <p className="mt-8 flex items-center gap-3 text-[11px] tracking-[0.26em] uppercase text-accent font-semibold">
              <span className="h-px w-7 bg-accent" aria-hidden />
              Local creatives × local business
            </p>
            <h2 className="font-display text-[2.6rem] leading-[1.02] mt-5">
              Get discovered.<br />Get booked.<br /><em className="text-sea">one swipe apart.</em>
            </h2>
          </div>
          <ul className="relative mt-10 space-y-4 stagger">
            {VALUE_PROPS.map(v => (
              <li key={v.title} className="flex items-start gap-3">
                <span aria-hidden className="mt-0.5 grid place-items-center h-6 w-6 shrink-0 rounded-full bg-accent/15 text-accent">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4.5 4.5L19 7" /></svg>
                </span>
                <span>
                  <span className="block text-sm font-semibold leading-tight">{v.title}</span>
                  <span className="block text-xs text-muted mt-0.5">{v.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* ===== Auth panel ===== */}
        <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="lg:hidden mb-6 text-center">
            <img src="/coop-wordmark.png" alt="Co-op" width={60} height={60} className="mx-auto rounded-xl shadow-[var(--shadow-sm)]" />
          </div>
          <h1 className="font-display text-[2rem] leading-tight">Welcome to Co-op</h1>
          <p className="text-muted text-sm mt-2 max-w-xs">{subtitle}</p>

          <div className="mt-7">
            <GoogleButton role={role} next={next} />
          </div>
          <div className="flex items-center gap-3 my-6" aria-hidden>
            <span className="h-px flex-1 bg-line" /><span className="text-xs text-muted">or</span><span className="h-px flex-1 bg-line" />
          </div>
          <EmailPasswordForm role={role} next={next} initialMode={initialMode} />
          <p className="text-xs text-muted mt-7 leading-relaxed">
            Your account is either a creative or a business — pick the side that fits, it&rsquo;s set at signup.
          </p>
        </div>
      </Card>
    </div>
  );
}
