import Link from 'next/link';
import type { ReactNode } from 'react';
import { LOCATION_GROUPS, WEEKDAYS } from '@/lib/types';

export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: {
  children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = {
    primary: 'bg-foreground text-background hover:opacity-85',
    secondary: 'bg-accent-soft text-foreground hover:bg-line',
    ghost: 'bg-transparent text-foreground hover:bg-line/60 border border-line',
    danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  }[variant];
  const s = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' }[size];
  return <button className={`rounded-full font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${v} ${s} ${className}`} {...props}>{children}</button>;
}

export function LinkButton({ href, children, variant = 'primary', size = 'md', className = '' }: {
  href: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' | 'lg'; className?: string;
}) {
  const v = {
    primary: 'bg-foreground text-background hover:opacity-85',
    secondary: 'bg-accent-soft text-foreground hover:bg-line',
    ghost: 'bg-transparent text-foreground hover:bg-line/60 border border-line',
  }[variant];
  const s = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-sm', lg: 'px-7 py-3.5 text-base' }[size];
  return <Link href={href} className={`inline-block rounded-full font-medium transition-all ${v} ${s} ${className}`}>{children}</Link>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-card rounded-3xl border border-line shadow-[0_2px_16px_rgba(45,42,38,0.05)] ${className}`}>{children}</div>;
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
      <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-accent-soft flex items-center justify-center text-2xl" aria-hidden>🌊</div>
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

export function LocationSelect({ name = 'neighborhood', defaultValue, allowAny = false, anyLabel = 'All locations', className = '', ariaLabel }: {
  name?: string; defaultValue?: string | null; allowAny?: boolean; anyLabel?: string; className?: string; ariaLabel?: string;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? (allowAny ? '' : 'Newport Beach')} className={`${inputCls} ${className}`} aria-label={ariaLabel}>
      {allowAny && <option value="">{anyLabel}</option>}
      {Object.entries(LOCATION_GROUPS).map(([region, areas]) => (
        <optgroup key={region} label={region}>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

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
