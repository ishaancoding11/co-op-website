import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStaffRole } from '@/lib/auth';

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/support', label: 'Support' },
  { href: '/admin/jobs', label: 'Jobs' },
  { href: '/admin/billing', label: 'Billing' },
];

/**
 * notFound(), not redirect().
 *
 * A signed-in user who probes /admin should not learn that /admin exists — a
 * redirect says "this is a real place, just not for you." The real gate is in
 * Postgres: every admin_* RPC re-checks is_staff()/is_admin() itself from
 * auth.uid(), so this check decides what gets RENDERED, not what's readable.
 * Even if this layout had a bug, the data underneath stays refused.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { staffRole } = await getStaffRole();
  if (!staffRole) notFound();

  return (
    <div className="py-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-baseline gap-4">
        <h1 className="font-display text-3xl">Staff</h1>
        <span className="text-xs text-muted capitalize">{staffRole}</span>
        <nav className="flex flex-wrap gap-1 ml-auto" aria-label="Staff sections">
          {TABS.map(t => (
            <Link key={t.href} href={t.href} className="rounded-full px-3.5 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:bg-line/50">
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
