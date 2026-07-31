import Link from 'next/link';
import { getViewer } from '@/lib/auth';
import { Avatar, IconBell, IconGear, IconHeart, IconPlus, IconSearch } from './ui';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/lib/types';
import { SignupGate } from './signup-gate';
import { GetStartedButton } from './get-started-button';

const iconBtnCls = 'rounded-full h-10 w-10 flex items-center justify-center text-muted hover:text-foreground hover:bg-line/50 transition-colors';

function UtilityIcons({ unread, profileHref, displayName, avatarUrl }: {
  unread: number; profileHref: string; displayName: string; avatarUrl: string | null | undefined;
}) {
  return (
    <>
      <Link href="/favorites" aria-label="Saved" className={iconBtnCls}><IconHeart /></Link>
      <Link href="/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className={`relative ${iconBtnCls}`}>
        <IconBell />
        {unread > 0 && <span className="absolute top-1 right-1 bg-accent text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
      </Link>
      <Link href="/settings" aria-label="Settings" className={iconBtnCls}><IconGear /></Link>
      <Link href={profileHref} aria-label="My profile" className="ml-1.5 rounded-full ring-2 ring-line hover:ring-accent transition-shadow shrink-0">
        <Avatar name={displayName} url={avatarUrl} size={34} />
      </Link>
    </>
  );
}

export async function Nav() {
  const { userId, activeRole, creative, business, supabase } = await getViewer();
  let unread = 0;
  let displayName = 'Me';
  if (userId) {
    const [{ count }, { data: u }] = await Promise.all([
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false),
      supabase.from('users').select('display_name').eq('id', userId).maybeSingle(),
    ]);
    unread = count ?? 0;
    displayName = (activeRole === 'business' ? business?.business_name : u?.display_name) ?? u?.display_name ?? 'Me';
  }

  // Logo routes to the role's home surface (business → browse creatives, creative → job feed)
  const logoHref = activeRole === 'business' ? '/browse' : activeRole === 'creative' ? '/jobs' : '/';
  const logo = (
    <Link href={logoHref} className="flex items-center gap-2 font-display text-xl tracking-tight shrink-0" aria-label="Co-op home">
      <img src="/coop-logo-full.svg" alt="" width={38} height={32} />
      Co<span className="text-accent">·</span>op
    </Link>
  );

  // ===== Signed out =====
  if (!userId || !activeRole) {
    return (
      <>
        <SignupGate />
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-line">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
            {logo}
            <nav className="flex items-center gap-2">
              <Link href="/browse" className="hidden md:block rounded-full px-3.5 py-1.5 text-sm font-medium text-muted hover:text-foreground">Browse creatives</Link>
              <Link href="/jobs" className="hidden md:block rounded-full px-3.5 py-1.5 text-sm font-medium text-muted hover:text-foreground">Browse jobs</Link>
              <Link href="/login?mode=login" className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted hover:text-foreground">Log in</Link>
              <GetStartedButton />
            </nav>
          </div>
        </header>
      </>
    );
  }

  const profileHref = activeRole === 'business' ? `/business/${userId}` : `/creatives/${userId}`;
  const avatarUrl = activeRole === 'business' ? business?.logo_url : creative?.avatar_url;

  // ===== Business shell: hiring toolbar, no category strip =====
  if (activeRole === 'business') {
    const links = [
      { href: '/browse', label: 'Browse creatives' },
      { href: '/discover', label: 'Discover' },
      { href: '/jobs/mine', label: 'My jobs & applicants' },
      { href: '/matches', label: 'Matches' },
      { href: '/dashboard', label: 'Bookings' },
      { href: '/billing', label: 'Billing' },
    ];
    return (
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-5">
          {logo}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-0.5">
            {links.map(l => (
              <Link key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-line/50 whitespace-nowrap">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 ml-auto">
            <Link href="/jobs/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white pl-4 pr-5 py-2.5 text-sm font-semibold hover:opacity-85 shadow-sm mr-2 whitespace-nowrap">
              <IconPlus /> Post a job
            </Link>
            <UtilityIcons unread={unread} profileHref={profileHref} displayName={displayName} avatarUrl={avatarUrl} />
          </div>
        </div>
        {/* Mobile business toolbar */}
        <nav aria-label="Primary mobile" className="lg:hidden border-t border-line/70">
          <div className="mx-auto max-w-6xl px-4 flex gap-1 overflow-x-auto py-1.5 text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {links.map(l => (
              <Link key={l.href} href={l.href} className="shrink-0 rounded-full px-3 py-1 font-medium text-muted hover:text-foreground hover:bg-line/50 whitespace-nowrap">{l.label}</Link>
            ))}
          </div>
        </nav>
      </header>
    );
  }

  // ===== Creative shell: search + category discovery, bottom tabs on mobile =====
  const creativeTabs = [
    { href: '/jobs', label: 'Jobs' },
    { href: '/matches', label: 'Matches' },
    { href: '/dashboard', label: 'Bookings' },
    { href: '/portfolio', label: 'Portfolio' },
  ];
  return (
    <>
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
          {logo}
          <form action="/jobs" role="search" className="hidden sm:flex flex-1 max-w-md">
            <div className="flex w-full rounded-full border border-line bg-card overflow-hidden focus-within:border-accent">
              <input name="q" placeholder="Search jobs…" aria-label="Search jobs"
                className="flex-1 px-4 py-2 text-sm bg-transparent placeholder:text-muted/70 focus:outline-none" />
              <button className="px-4 bg-foreground text-background hover:opacity-85 flex items-center" aria-label="Search"><IconSearch /></button>
            </div>
          </form>
          <div className="flex items-center gap-1 ml-auto">
            <nav aria-label="Primary" className="hidden lg:flex items-center gap-1 mr-2">
              {[...creativeTabs, { href: '/billing', label: 'Billing' }].map(t => (
                <Link key={t.href} href={t.href} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:bg-line/50">
                  {t.label}
                </Link>
              ))}
            </nav>
            <UtilityIcons unread={unread} profileHref={profileHref} displayName={displayName} avatarUrl={avatarUrl} />
          </div>
        </div>
        <nav aria-label="Job categories" className="border-t border-line/70">
          <div className="mx-auto max-w-6xl px-4 flex gap-1 overflow-x-auto py-1.5 text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href="/jobs" className="shrink-0 rounded-full px-3 py-1 font-medium text-muted hover:text-foreground hover:bg-line/50">All</Link>
            {ALL_CATEGORIES.map(c => (
              <Link key={c} href={`/jobs?category=${c}`}
                className="shrink-0 rounded-full px-3 py-1 font-medium text-muted hover:text-foreground hover:bg-line/50 whitespace-nowrap">
                {CATEGORY_LABELS[c]}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <nav aria-label="Primary mobile" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around">
          {creativeTabs.map(t => (
            <Link key={t.href} href={t.href} className="py-3 px-3 text-xs font-semibold text-muted hover:text-foreground">
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
