import Link from 'next/link';
import { getViewer } from '@/lib/auth';
import { Avatar, IconBell, IconPlus } from './ui';
import { SignupGate } from './signup-gate';
import { BottomNav, type BottomTab } from './bottom-nav';
import { YouMenu, type YouMenuItem } from './you-menu';
import { GetStartedButton } from './get-started-button';
import { getT } from '@/lib/i18n-server';
import { LanguageSwitcher } from './language-switcher';

// Shared visual tokens for the 4 primary tab links so the desktop top bar and
// the mobile bottom bar stay in sync. `active` uses the accent chip; idle is
// muted with a subtle hover raise.
const tabIconProps = {
  width: 22, height: 22, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};

const IconHome = (
  <svg {...tabIconProps} aria-hidden>
    <path d="M3.5 11.2 12 4l8.5 7.2V20a1 1 0 0 1-1 1h-4.5v-6.2h-6V21H4.5a1 1 0 0 1-1-1v-8.8Z" />
  </svg>
);
const IconCompass = (
  <svg {...tabIconProps} aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.7 8.3-2.2 5.4-5.4 2.2 2.2-5.4 5.4-2.2Z" />
  </svg>
);
const IconChat = (
  <svg {...tabIconProps} aria-hidden>
    <path d="M4 6a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 20 6v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4A2.5 2.5 0 0 1 2.5 14V6Z" transform="translate(1.5 0.5)" />
  </svg>
);

// Small square icons used inside the YouMenu list items.
const menuIcon = {
  width: 16, height: 16, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};
const IconUser = <svg {...menuIcon} aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
const IconGrid = <svg {...menuIcon} aria-hidden><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /><rect x="13" y="13" width="8" height="8" rx="1.5" /></svg>;
const IconBriefcase = <svg {...menuIcon} aria-hidden><rect x="3" y="7" width="18" height="13" rx="2.5" /><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" /></svg>;
const IconHeartSm = <svg {...menuIcon} aria-hidden><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z" /></svg>;
const IconCard = <svg {...menuIcon} aria-hidden><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18" /></svg>;
const IconGearSm = <svg {...menuIcon} aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>;

const iconBtnCls = 'relative rounded-full h-10 w-10 flex items-center justify-center text-muted hover:text-foreground hover:bg-line/50 transition-colors';

function NotifBell({ href, unread, label }: { href: string; unread: number; label: string }) {
  return (
    <Link href={href} aria-label={unread ? `${label}, ${unread} unread` : label} className={iconBtnCls}>
      <IconBell />
      {unread > 0 && (
        <span className="absolute top-1 right-1 bg-accent text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}

function DesktopTabLink({ href, label, icon, badge, active }: {
  href: string; label: string; icon: React.ReactNode; badge?: number; active: boolean;
}) {
  return (
    <Link href={href} aria-current={active ? 'page' : undefined}
      className={`hidden lg:inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
        active ? 'text-accent bg-accent-soft' : 'text-muted hover:text-foreground hover:bg-line/50'
      }`}>
      <span className="relative">
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-1.5 bg-accent text-white text-[9px] leading-none font-bold rounded-full min-w-[14px] h-[14px] px-1 grid place-items-center">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  );
}

export async function Nav() {
  const { userId, activeRole, creative, business, supabase } = await getViewer();
  const { locale, t } = await getT();

  // ===== Signed out =====
  if (!userId || !activeRole) {
    const langSwitcher = <LanguageSwitcher current={locale} label={t('nav.language')} />;
    return (
      <>
        <SignupGate />
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-line/80 shadow-[0_1px_0_rgba(58,48,38,0.02)]">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 font-display text-xl tracking-tight shrink-0" aria-label="Co-op home">
              <img src="/coop-logo.png" alt="" width={30} height={30} />
              Co<span className="text-accent">·</span>op
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/browse" className="hidden md:block rounded-full px-3.5 py-1.5 text-sm font-medium text-muted hover:text-foreground">{t('nav.browseCreatives')}</Link>
              <Link href="/jobs" className="hidden md:block rounded-full px-3.5 py-1.5 text-sm font-medium text-muted hover:text-foreground">{t('nav.browseJobs')}</Link>
              {langSwitcher}
              <Link href="/login?mode=login" className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted hover:text-foreground">{t('nav.login')}</Link>
              <GetStartedButton />
            </nav>
          </div>
        </header>
      </>
    );
  }

  // ===== Signed in — unified 4-tab structure =====
  // We fetch the notification unread count *and* the unread-messages count so
  // that both the Messages tab and the bell can carry their own live badges.
  const [{ count: notifUnread }, { count: msgUnread }, { data: u }] = await Promise.all([
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false),
    supabase.from('messages').select('id', { count: 'exact', head: true }).is('read_at', null).neq('sender_id', userId),
    supabase.from('users').select('display_name').eq('id', userId).maybeSingle(),
  ]);
  const unread = notifUnread ?? 0;
  const unreadMessages = msgUnread ?? 0;
  const displayName =
    (activeRole === 'business' ? business?.business_name : u?.display_name) ?? u?.display_name ?? 'Me';

  // The profile link must not assume a row exists yet — activeRole comes from
  // the cookie while creative/business rows may still be null mid-onboarding.
  const profileHref = activeRole === 'business'
    ? (business ? `/business/${userId}` : '/onboarding/business')
    : (creative ? `/creatives/${userId}` : '/onboarding/creative');
  const avatarUrl = activeRole === 'business' ? business?.logo_url : creative?.avatar_url;

  // Role-specific routes wrapped into the same 4-tab shape.
  const browseHref = activeRole === 'business' ? '/browse' : '/jobs';
  const browseLabel = t('nav.browse');
  const postHref = activeRole === 'business' ? '/jobs/new' : '/portfolio';
  const postLabel = activeRole === 'business' ? t('nav.postJob') : t('portfolio.addPiece');

  // Everything secondary lives inside the You menu so the top bar stays lean.
  const youItems: YouMenuItem[] = [
    { href: profileHref, label: t('nav.viewMyProfile'), icon: IconUser },
    activeRole === 'creative'
      ? { href: '/portfolio', label: t('nav.portfolio'), icon: IconGrid }
      : { href: '/jobs/mine', label: t('nav.myJobsShort'), icon: IconBriefcase },
    { href: '/dashboard', label: t('nav.bookings'), icon: IconBriefcase },
    { href: '/favorites', label: t('nav.saved'), icon: IconHeartSm },
    { href: '/billing', label: t('nav.billing'), icon: IconCard },
    { href: '/settings', label: t('nav.settings'), icon: IconGearSm },
  ];

  const bottomTabs: BottomTab[] = [
    { href: '/', label: t('nav.home'), icon: IconHome },
    { href: browseHref, label: browseLabel, icon: IconCompass },
    { href: '/matches', label: t('nav.messages'), icon: IconChat, badge: unreadMessages, matchPrefixes: ['/messages'] },
  ];

  // Compute active state for desktop tab pills without importing the client
  // pathname (the server already knows the route via getViewer? No — we let
  // the client-side <BottomNav> handle active. For the desktop tabs, we keep
  // it simple: no `active` server-side, just idle styles. Optional polish.)
  return (
    <>
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-display text-xl tracking-tight shrink-0" aria-label="Co-op home">
            <img src="/coop-logo.png" alt="" width={28} height={28} />
            Co<span className="text-accent">·</span>op
          </Link>

          {/* Desktop-only primary tabs. On mobile these live in <BottomNav>. */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-1 ml-3">
            <DesktopTabLink href="/" label={t('nav.home')} icon={IconHome} active={false} />
            <DesktopTabLink href={browseHref} label={browseLabel} icon={IconCompass} active={false} />
            <DesktopTabLink href="/matches" label={t('nav.messages')} icon={IconChat} badge={unreadMessages} active={false} />
          </nav>

          <div className="flex items-center gap-1 ml-auto">
            <Link href={postHref}
              className="press inline-flex items-center gap-1.5 rounded-full bg-accent text-white pl-3.5 pr-4 py-2 text-sm font-semibold shadow-[var(--shadow-sm)] hover:bg-accent-deep transition-colors whitespace-nowrap"
              aria-label={postLabel}>
              <IconPlus />
              <span className="hidden sm:inline">{activeRole === 'business' ? t('nav.postJob') : t('portfolio.addPiece')}</span>
            </Link>
            <NotifBell href="/notifications" unread={unread} label={t('nav.notifications')} />
            {/* Desktop shows the YouMenu at the top; mobile hides it here (it's
                already rendered inside <BottomNav> below). */}
            <div className="hidden lg:block">
              <YouMenu
                variant="desktop"
                displayName={displayName}
                avatarUrl={avatarUrl}
                items={youItems}
                locale={locale}
                langLabel={t('nav.language')}
                signOutLabel={t('nav.signOut')}
              />
            </div>
          </div>
        </div>
      </header>

      <BottomNav
        tabs={bottomTabs}
        youSlot={
          <YouMenu
            variant="mobile"
            displayName={displayName}
            avatarUrl={avatarUrl}
            items={youItems}
            locale={locale}
            langLabel={t('nav.language')}
            signOutLabel={t('nav.signOut')}
          />
        }
      />
    </>
  );
}
