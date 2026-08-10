import Link from 'next/link';
import { redirect } from 'next/navigation';
import { chooseRole } from '@/lib/actions';
import { getViewer, getStaffRole } from '@/lib/auth';
import { Card } from '@/components/ui';
import { TodayFeed } from '@/components/today-feed';
import { OnboardingChecklist } from '@/components/onboarding-checklist';
import { ALL_CATEGORIES, categoryLabel } from '@/lib/types';
import { getLocale } from '@/lib/i18n-server';
import { CategoryIcon } from '@/components/category-icon';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export default async function Landing() {
  // Signed-in users land on their Today feed — the summary of what's new
  // in messages, matches, jobs, and nearby creatives.
  const { userId, creative, business, activeRole } = await getViewer();
  if (userId && activeRole && (creative || business)) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: u } = await supabase.from('users').select('display_name').eq('id', userId).maybeSingle();
    const displayName =
      (activeRole === 'business' ? business?.business_name : u?.display_name) ?? u?.display_name ?? 'friend';
    const profileHref = activeRole === 'business'
      ? (business ? `/business/${userId}` : '/onboarding/business')
      : (creative ? `/creatives/${userId}` : '/onboarding/creative');
    return (
      <div className="py-2 space-y-6">
        <div className="pt-6">
          <OnboardingChecklist
            userId={userId}
            creative={creative}
            business={business}
            activeRole={activeRole}
          />
        </div>
        <TodayFeed
          userId={userId}
          activeRole={activeRole}
          displayName={displayName}
          profileHref={profileHref}
          creativeCategories={creative?.categories ?? []}
          businessNeighborhood={business?.neighborhood ?? null}
        />
      </div>
    );
  }
  // A staff account with no creative/business profile skips onboarding
  // entirely and goes straight to the admin panel. Only reachable if
  // staff_role was already granted via a manual SQL update — there's no
  // signup path that sets it.
  if (userId && !creative && !business) {
    const { staffRole } = await getStaffRole();
    if (staffRole) redirect('/admin');
  }
  const locale = await getLocale();
  return (
    <div className="py-14 md:py-24">
      {/* ===== Hero — editorial, left-anchored, oversized Fraunces ===== */}
      <div className="max-w-4xl">
        <img src="/coop-wordmark.png" alt="Co-op" width={132} height={132}
          className="animate-rise rounded-2xl shadow-[var(--shadow-md)] mb-8 h-28 w-28 md:h-32 md:w-32" />
        <p className="animate-rise flex items-center gap-3 text-[11px] tracking-[0.28em] uppercase text-accent font-semibold" style={{ animationDelay: '40ms' }}>
          <span className="h-px w-8 bg-accent" aria-hidden />
          Find your local creative match
        </p>
        <h1 className="animate-rise font-display text-[2.75rem] leading-[1.02] mt-6 md:text-[5.25rem] md:leading-[0.98]" style={{ animationDelay: '60ms' }}>
          Local creatives.<br />
          Local businesses.<br />
          <em className="text-sea">one swipe apart.</em>
        </h1>
        <p className="animate-rise text-muted mt-7 max-w-xl text-base md:text-lg leading-relaxed" style={{ animationDelay: '120ms' }}>
          Co-op connects small businesses with nearby freelance creatives for photos, reels, branding, murals, and live music. Personal, quick, and easy — and Co-op <span className="text-foreground font-medium">never takes a cut.</span>
        </p>
        <p className="animate-rise text-sm text-muted mt-5" style={{ animationDelay: '160ms' }}>
          Already have an account? <Link href="/login?mode=login" className="text-foreground font-medium underline decoration-accent/40 underline-offset-4 hover:decoration-accent">Log in</Link>
        </p>
      </div>

      {/* ===== Role choice — two clean, restrained panels ===== */}
      <div className="animate-rise grid md:grid-cols-2 gap-4 mt-14" style={{ animationDelay: '220ms' }}>
        <Card className="group p-7 flex flex-col items-start gap-4 transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-md)]">
          <span className="grid place-items-center h-11 w-11 rounded-2xl bg-accent-soft text-accent transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c.6 4 1.8 5.2 5.8 5.8-4 .6-5.2 1.8-5.8 5.8-.6-4-1.8-5.2-5.8-5.8 4-.6 5.2-1.8 5.8-5.8Z"/><path d="M18 15.5c.3 1.8.9 2.4 2.7 2.7-1.8.3-2.4.9-2.7 2.7-.3-1.8-.9-2.4-2.7-2.7 1.8-.3 2.4-.9 2.7-2.7Z"/></svg>
          </span>
          <div>
            <h2 className="font-display text-2xl">I&rsquo;m a creative</h2>
            <p className="text-sm text-muted mt-1.5">Get discovered by local businesses, show your portfolio, and land paid gigs in your own community.</p>
          </div>
          <form action={chooseRole.bind(null, 'creative')} className="mt-1">
            <button className="press rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-medium shadow-[var(--shadow-sm)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">Join as a creative</button>
          </form>
        </Card>
        <Card className="group p-7 flex flex-col items-start gap-4 transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-md)]">
          <span className="grid place-items-center h-11 w-11 rounded-2xl bg-sea-soft text-sea transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-105" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9.5 5.2 5.3A1.5 1.5 0 0 1 6.6 4.2h10.8a1.5 1.5 0 0 1 1.4 1.1L20 9.5"/><path d="M4 9.5h16v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5Z"/><path d="M4 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0"/><path d="M9.5 20v-4.5h5V20"/></svg>
          </span>
          <div>
            <h2 className="font-display text-2xl">I&rsquo;m a business</h2>
            <p className="text-sm text-muted mt-1.5">Find a trusted nearby photographer, designer, or performer fast — swipe, match, and book directly.</p>
          </div>
          <form action={chooseRole.bind(null, 'business')} className="mt-1">
            <button className="press rounded-full bg-accent text-white px-6 py-2.5 text-sm font-medium shadow-[var(--shadow-sm)] transition-[transform,box-shadow,background-color] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:bg-accent-deep">Join as a business</button>
          </form>
        </Card>
      </div>

      {/* ===== Guest browse ===== */}
      <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted">Just looking? No account needed —</span>
        <Link href="/browse" className="rounded-full border border-line bg-card px-5 py-2 font-medium hover:border-accent hover:text-accent transition-colors">
          Browse creatives
        </Link>
        <Link href="/jobs" className="rounded-full border border-line bg-card px-5 py-2 font-medium hover:border-sea hover:text-sea transition-colors">
          Browse jobs
        </Link>
      </div>

      {/* ===== Browse by category — big, friendly tap targets like a home feed ===== */}
      <div className="mt-16">
        <h2 className="font-display text-2xl">Browse by category</h2>
        <p className="text-muted text-sm mt-1">Tap what you&rsquo;re looking for — no account needed.</p>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {ALL_CATEGORIES.map(c => (
            <Link key={c} href={`/browse?category=${c}`}
              className="press group flex items-center gap-3 rounded-2xl bg-card border border-line px-4 py-3.5 transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-accent/60 hover:shadow-[var(--shadow-md)]">
              <span className="grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-surface-2 text-muted transition-colors group-hover:bg-accent-soft group-hover:text-accent">
                <CategoryIcon category={c} size={20} />
              </span>
              <span className="text-sm font-semibold leading-tight group-hover:text-accent transition-colors">{categoryLabel(c, locale)}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ===== Stats band — editorial, serif numerals, hairline dividers ===== */}
      <div className="mt-20 border-t border-line-strong pt-8 grid grid-cols-3 gap-4 max-w-2xl">
        <div>
          <p className="font-display text-4xl text-accent">0%</p>
          <p className="text-muted text-xs mt-1.5 tracking-wide">platform fees, ever</p>
        </div>
        <div className="md:pl-6 md:border-l border-line">
          <p className="font-display text-4xl">Local</p>
          <p className="text-muted text-xs mt-1.5 tracking-wide">your neighborhood only</p>
        </div>
        <div className="md:pl-6 md:border-l border-line">
          <p className="font-display text-4xl text-sea">Direct</p>
          <p className="text-muted text-xs mt-1.5 tracking-wide">you two, no middleman</p>
        </div>
      </div>
    </div>
  );
}
