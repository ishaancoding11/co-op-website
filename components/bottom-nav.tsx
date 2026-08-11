'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export type BottomTab = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Optional unread badge next to the icon (Messages, Notifications). */
  badge?: number;
  /** Match when pathname exactly equals `href` or starts with any of these. */
  matchPrefixes?: string[];
};

export function BottomNav({ tabs, youSlot }: { tabs: BottomTab[]; youSlot: ReactNode }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary mobile"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-end px-2 py-1.5">
        {tabs.map(tab => {
          const active =
            pathname === tab.href ||
            pathname.startsWith(tab.href + '/') ||
            (tab.matchPrefixes ?? []).some(p => pathname === p || pathname.startsWith(p + '/'));
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-3.5 py-1 text-[11px] font-semibold transition-colors ${active ? 'text-accent bg-accent-soft' : 'text-muted hover:text-foreground'}`}>
              <span className="relative">
                {tab.icon}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-1.5 bg-accent text-white text-[9px] leading-none font-bold rounded-full min-w-[14px] h-[14px] px-1 grid place-items-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                ) : null}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
        {youSlot}
      </div>
    </nav>
  );
}
