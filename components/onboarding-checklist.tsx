import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { LineIcon } from './line-icons';
import type { BusinessProfile, CreativeProfile } from '@/lib/types';

// A quiet checklist that only appears when the user still has setup work to
// do. Once every item is checked, the whole card disappears — so it never
// nags long-term users.

type Item = { key: string; label: string; href: string; done: boolean; hint?: string };

async function creativeItems(userId: string, c: CreativeProfile): Promise<Item[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { count } = await supabase.from('portfolio_items')
    .select('id', { count: 'exact', head: true }).eq('creative_id', userId).eq('is_hidden', false);
  const pieces = count ?? 0;
  return [
    { key: 'photo', label: 'Add a profile photo', href: '/onboarding/creative', done: !!c.avatar_url, hint: 'Real photos get 3× more replies' },
    { key: 'bio', label: 'Write a short bio', href: '/onboarding/creative', done: !!c.bio && c.bio.length > 20 },
    { key: 'category', label: 'Pick your categories', href: '/onboarding/creative', done: (c.categories?.length ?? 0) > 0 },
    { key: 'rate', label: 'Set your starting rate', href: '/onboarding/creative', done: c.rate_min != null || c.rate_max != null },
    { key: 'portfolio', label: `Add ${Math.max(0, 3 - pieces)} more portfolio piece${3 - pieces === 1 ? '' : 's'}`, href: '/portfolio', done: pieces >= 3, hint: 'Businesses filter by pieces — 3 is the minimum to show up strong' },
    { key: 'public', label: 'Make profile public', href: '/settings', done: !!c.is_public },
  ];
}

async function businessItems(userId: string, b: BusinessProfile): Promise<Item[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { count } = await supabase.from('jobs')
    .select('id', { count: 'exact', head: true }).eq('business_id', userId);
  const jobsPosted = count ?? 0;
  return [
    { key: 'logo', label: 'Add your logo', href: '/onboarding/business', done: !!b.logo_url },
    { key: 'name', label: 'Set business name', href: '/onboarding/business', done: !!b.business_name && b.business_name.length > 1 },
    { key: 'neighborhood', label: 'Add your neighborhood', href: '/onboarding/business', done: !!b.neighborhood },
    { key: 'needs', label: 'Tell us what you\'re looking for', href: '/onboarding/business', done: (b.needs?.length ?? 0) > 0 },
    { key: 'verify', label: 'Get the verified badge', href: '/onboarding/business/verify', done: !!b.is_verified, hint: 'Verified businesses get 2× more applications' },
    { key: 'firstJob', label: 'Post your first job', href: '/jobs/new', done: jobsPosted >= 1 },
  ];
}

export async function OnboardingChecklist({
  userId, creative, business, activeRole,
}: {
  userId: string;
  creative: CreativeProfile | null;
  business: BusinessProfile | null;
  activeRole: 'creative' | 'business';
}) {
  const items: Item[] =
    activeRole === 'creative' && creative ? await creativeItems(userId, creative)
    : activeRole === 'business' && business ? await businessItems(userId, business)
    : [];
  if (!items.length) return null;

  const done = items.filter(i => i.done).length;
  const total = items.length;
  if (done === total) return null; // fully complete — quietly disappear
  const pct = Math.round((done / total) * 100);
  const nextItem = items.find(i => !i.done);

  return (
    <section
      aria-label="Setup progress"
      className="rounded-3xl border border-line bg-gradient-to-br from-accent-soft/40 via-card to-gold-soft/30 p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-accent">Complete your profile</p>
          <h2 className="font-display text-xl mt-1">{done} of {total} done</h2>
          <p className="text-sm text-muted mt-1">
            {nextItem ? <>Next up: <span className="text-foreground font-medium">{nextItem.label}</span></> : 'You’re almost there.'}
          </p>
        </div>
        <span className="grid place-items-center h-12 w-12 rounded-2xl bg-card ring-1 ring-line text-accent shadow-[var(--shadow-sm)] shrink-0">
          <span className="font-display text-sm tabular-nums">{pct}%</span>
        </span>
      </div>

      {/* progress bar */}
      <div className="mt-4 h-1.5 rounded-full bg-line/60 overflow-hidden">
        <div className="h-full bg-accent transition-[width] duration-500 ease-[var(--ease-out)]" style={{ width: `${pct}%` }} aria-hidden />
      </div>

      {/* items */}
      <ul className="mt-5 space-y-1.5">
        {items.map(item => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="group flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-background/70 transition-colors">
              <span
                aria-hidden
                className={`grid place-items-center h-5 w-5 rounded-full border transition-colors ${
                  item.done
                    ? 'border-sea bg-sea text-background'
                    : 'border-line-strong bg-card text-transparent group-hover:border-accent'
                }`}>
                <LineIcon name="check" size={13} />
              </span>
              <span className={`flex-1 text-sm ${item.done ? 'text-muted line-through' : 'text-foreground'}`}>
                {item.label}
              </span>
              {!item.done && item.hint && (
                <span className="hidden sm:inline text-[11px] text-muted italic">{item.hint}</span>
              )}
              {!item.done && (
                <span aria-hidden className="text-muted/60 group-hover:text-accent transition-colors">→</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
