'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type Tab = { href: string; label: string; icon: 'jobs' | 'matches' | 'bookings' | 'portfolio' };

const ic = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ICONS: Record<Tab['icon'], ReactNode> = {
  jobs: <svg {...ic} aria-hidden><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/></svg>,
  matches: <svg {...ic} aria-hidden><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-3.3A8.4 8.4 0 1 1 21 11.5Z"/></svg>,
  bookings: <svg {...ic} aria-hidden><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 3v3M16 3v3"/></svg>,
  portfolio: <svg {...ic} aria-hidden><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>,
};

export function BottomNav({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary mobile" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around px-2 py-1.5">
        {tabs.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-4 py-1.5 text-[11px] font-semibold transition-colors ${active ? 'text-accent bg-accent-soft' : 'text-muted hover:text-foreground'}`}>
              {ICONS[tab.icon]}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
