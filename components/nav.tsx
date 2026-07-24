import Link from 'next/link';
import { getViewer } from '@/lib/auth';
import { LinkButton, Avatar } from './ui';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/lib/types';
import { SignupGate } from './signup-gate';

const creativeTabs = [
  { href: '/jobs', label: 'Jobs', icon: '💼' },
  { href: '/matches', label: 'Matches', icon: '🤝' },
  { href: '/dashboard', label: 'Bookings', icon: '📋' },
  { href: '/portfolio', label: 'Portfolio', icon: '🎨' },
];
const businessTabs = [
  { href: '/discover', label: 'Discover', icon: '🔥' },
  { href: '/browse', label: 'Browse', icon: '🔎' },
  { href: '/jobs/new', label: 'Post', icon: '➕' },
  { href: '/jobs/mine', label: 'My jobs', icon: '💼' },
  { href: '/matches', label: 'Matches', icon: '🤝' },
  { href: '/dashboard', label: 'Bookings', icon: '📋' },
];

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
  const profileHref = activeRole === 'business' ? `/business/${userId}` : `/creatives/${userId}`;
  const avatarUrl = activeRole === 'business' ? business?.logo_url : creative?.avatar_url;
  const tabs = activeRole === 'business' ? businessTabs : activeRole === 'creative' ? creativeTabs : [];
  // Search + category strip target the viewer's discovery surface (Fiverr-style)
  const searchTarget = activeRole === 'creative' ? '/jobs' : '/browse';
  const searchPlaceholder = activeRole === 'creative' ? 'Search jobs…' : 'Search local creatives…';

  return (
    <>
      {!userId && <SignupGate />}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-display text-xl tracking-tight shrink-0" aria-label="Co-op home">
            <img src="/coop-logo-full.svg" alt="" width={38} height={32} />
            Co<span className="text-accent">·</span>op
          </Link>

          {/* Fiverr-style center search */}
          <form action={searchTarget} role="search" className="hidden sm:flex flex-1 max-w-md">
            <div className="flex w-full rounded-full border border-line bg-card overflow-hidden focus-within:border-accent">
              <input name="q" placeholder={searchPlaceholder} aria-label={searchPlaceholder}
                className="flex-1 px-4 py-2 text-sm bg-transparent placeholder:text-muted/70 focus:outline-none" />
              <button className="px-4 bg-foreground text-background text-sm font-medium hover:opacity-85" aria-label="Search">🔎</button>
            </div>
          </form>

          <div className="flex items-center gap-1 ml-auto">
            {userId ? (
              <>
                <nav aria-label="Primary" className="hidden lg:flex items-center gap-1 mr-2">
                  {tabs.map(t => (
                    <Link key={t.href} href={t.href} className="rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:bg-line/50">
                      {t.label}
                    </Link>
                  ))}
                </nav>
                {activeRole === 'business' && (
                  <Link href="/jobs/new" className="hidden sm:inline-block rounded-full bg-accent text-white px-4 py-1.5 text-sm font-medium hover:opacity-85 mr-1">
                    + Post a job
                  </Link>
                )}
                <Link href="/favorites" aria-label="Saved" className="rounded-full h-9 w-9 flex items-center justify-center hover:bg-line/50">♡</Link>
                <Link href="/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} className="relative rounded-full h-9 w-9 flex items-center justify-center hover:bg-line/50">
                  🔔{unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-accent text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
                </Link>
                <Link href="/settings" aria-label="Settings" className="rounded-full h-9 w-9 flex items-center justify-center hover:bg-line/50">⚙︎</Link>
                <Link href={profileHref} aria-label="My profile" className="ml-1 rounded-full ring-2 ring-line hover:ring-accent transition-shadow">
                  <Avatar name={displayName} url={avatarUrl} size={32} />
                </Link>
              </>
            ) : (
              <>
                <Link href="/browse" className="hidden md:block rounded-full px-3.5 py-1.5 text-sm font-medium text-muted hover:text-foreground">Browse creatives</Link>
                <LinkButton href="/" size="sm">Get started</LinkButton>
              </>
            )}
          </div>
        </div>

        {/* Fiverr-style category strip */}
        <nav aria-label="Categories" className="border-t border-line/70">
          <div className="mx-auto max-w-6xl px-4 flex gap-1 overflow-x-auto py-1.5 text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href={searchTarget} className="shrink-0 rounded-full px-3 py-1 font-medium text-muted hover:text-foreground hover:bg-line/50">All</Link>
            {ALL_CATEGORIES.map(c => (
              <Link key={c} href={`${searchTarget}?category=${c}`}
                className="shrink-0 rounded-full px-3 py-1 font-medium text-muted hover:text-foreground hover:bg-line/50 whitespace-nowrap">
                {CATEGORY_LABELS[c]}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {/* Bottom tabs — mobile */}
      {userId && tabs.length > 0 && (
        <nav aria-label="Primary mobile" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-line pb-[env(safe-area-inset-bottom)]">
          <div className="flex justify-around">
            {tabs.map(t => (
              <Link key={t.href} href={t.href} className="flex flex-col items-center gap-0.5 py-2 px-3 text-[11px] font-medium text-muted hover:text-foreground">
                <span aria-hidden className="text-lg leading-none">{t.icon}</span>{t.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
