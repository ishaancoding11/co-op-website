import Link from 'next/link';
import type { ReactNode } from 'react';
import { WEEKDAYS } from '@/lib/types';

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: {
  children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = {
    primary: 'bg-foreground text-background shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] active:translate-y-0',
    secondary: 'bg-accent-soft text-accent-deep hover:bg-[var(--gold-soft)]',
    ghost: 'bg-transparent text-foreground hover:bg-line/60 border border-line',
    danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  }[variant];
  const s = { sm: 'px-3.5 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' }[size];
  return <button className={`rounded-full font-medium transition-[transform,box-shadow,background-color,opacity] duration-200 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 ${v} ${s} ${className}`} {...props}>{children}</button>;
}

export function LinkButton({ href, children, variant = 'primary', size = 'md', className = '' }: {
  href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' | 'lg'; className?: string;
}) {
  const v = {
    primary: 'bg-foreground text-background shadow-[var(--shadow-sm)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]',
    secondary: 'bg-accent-soft text-accent-deep hover:bg-[var(--gold-soft)]',
    ghost: 'bg-transparent text-foreground hover:bg-line/60 border border-line',
  }[variant];
  const s = { sm: 'px-3.5 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' }[size];
  return <Link href={href} className={`inline-block rounded-full font-medium transition-[transform,box-shadow,background-color,opacity] duration-200 ease-[var(--ease-out)] active:scale-[0.97] ${v} ${s} ${className}`}>{children}</Link>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-card rounded-3xl border border-line shadow-[var(--shadow-sm)] ${className}`}>{children}</div>;
}

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'sea' }) {
  const t = {
    neutral: 'bg-background border-line text-muted',
    accent: 'bg-accent-soft border-transparent text-accent',
    sea: 'bg-sea-soft border-transparent text-sea',
  }[tone];
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (url) return <img src={url} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <div aria-hidden className="rounded-full bg-sea-soft text-sea flex items-center justify-center font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials || '?'}</div>
  );
}

export function Rating({ value, count }: { value: number | null; count?: number }) {
  if (value == null) return <span className="text-xs text-muted">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className="text-gold" aria-hidden>★</span>
      <span className="font-semibold">{value.toFixed(1)}</span>
      {count != null && <span className="text-muted text-xs">({count})</span>}
    </span>
  );
}

export function PriceTag({ label }: { label: string | null }) {
  if (!label) return null;
  return <span className="inline-block rounded-lg bg-foreground text-background px-2 py-0.5 text-xs font-semibold">from {label.split('–')[0]}</span>;
}

export function VerifiedBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-sea-soft text-sea font-semibold ${small ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs'}`}
      title="Verified local business">
      <svg width={small ? 10 : 12} height={small ? 10 : 12} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2l2.4 2.4 3.4-.5 1 3.3 3 1.7-1.3 3.1 1.3 3.1-3 1.7-1 3.3-3.4-.5L12 22l-2.4-2.4-3.4.5-1-3.3-3-1.7L3.5 12 2.2 8.9l3-1.7 1-3.3 3.4.5z"/><path d="M10.6 14.6l-2.1-2.1-1.1 1.1 3.2 3.2 5.9-5.9-1.1-1.1z" fill="var(--sea-soft)"/></svg>
      Verified
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    open: 'bg-sea-soft text-sea', accepted: 'bg-sea-soft text-sea', completed: 'bg-sea-soft text-sea',
    in_progress: 'bg-accent-soft text-accent', requested: 'bg-accent-soft text-accent',
    applied: 'bg-accent-soft text-accent', shortlisted: 'bg-gold/20 text-yellow-700',
    closed: 'bg-line text-muted', declined: 'bg-line text-muted', cancelled: 'bg-line text-muted',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tones[status] ?? 'bg-line text-muted'}`}>{status.replace(/_/g, ' ')}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16 px-6">
      <img src="/coop-logo.png" alt="" width={52} height={52} className="mx-auto mb-4" aria-hidden />

      <h2 className="text-lg font-semibold">{title}</h2>
      {body && <p className="text-muted text-sm mt-1 max-w-sm mx-auto">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function NoFeeNote() {
  return (
    <p className="rounded-2xl bg-sea-soft text-sea text-sm px-4 py-3">
      Payments are handled directly between you two — Co-op charges no fees.
    </p>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm placeholder:text-muted/70 focus:border-accent focus:outline-none';

// ===== SVG icons (stroke inherits currentColor; sized for the nav) =====
function iconProps(size: number) {
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
}
export function IconHeart({ size = 20 }: { size?: number }) {
  return <svg {...iconProps(size)} aria-hidden><path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.1-7 .5.5 0 0 0 .8 0 5 5 0 1 1 7.1 7Z"/></svg>;
}
export function IconBell({ size = 20 }: { size?: number }) {
  return <svg {...iconProps(size)} aria-hidden><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>;
}
export function IconGear({ size = 20 }: { size?: number }) {
  return <svg {...iconProps(size)} aria-hidden><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>;
}
export function IconSearch({ size = 18 }: { size?: number }) {
  return <svg {...iconProps(size)} aria-hidden><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>;
}
export function IconPin({ size = 16 }: { size?: number }) {
  return <svg {...iconProps(size)} aria-hidden><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
}
export function IconPlus({ size = 16 }: { size?: number }) {
  return <svg {...iconProps(size)} aria-hidden><path d="M12 5v14M5 12h14"/></svg>;
}
export function IconChevronDown({ size = 14 }: { size?: number }) {
  return <svg {...iconProps(size)} aria-hidden><path d="m6 9 6 6 6-6"/></svg>;
}

// Dropdown/LocationSelect used to be native-<select>-based (styled closed box
// only — the open option list can't be restyled with CSS in any browser).
// Both now live in ./dropdown.tsx as a fully custom-rendered listbox;
// re-exported here so `from '@/components/ui'` keeps working for LocationSelect.
export { Dropdown, LocationSelect } from './dropdown';

export function AvailabilityStrip({ days }: { days: string[] }) {
  if (!days?.length) return null;
  const set = new Set(days);
  return (
    <div className="flex gap-1" role="img" aria-label={`Available on ${WEEKDAYS.filter(d => set.has(d.key)).map(d => d.label).join(', ')}`}>
      {WEEKDAYS.map(d => (
        <span key={d.key} aria-hidden
          className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${set.has(d.key) ? 'bg-sea text-white' : 'bg-line/60 text-muted line-through decoration-muted/40'}`}>
          {d.label}
        </span>
      ))}
    </div>
  );
}
