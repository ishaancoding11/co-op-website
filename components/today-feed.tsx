import Link from 'next/link';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Avatar, Tag, VerifiedBadge } from './ui';
import { LineIcon } from './line-icons';
import { CategoryIcon } from './category-icon';
import {
  CATEGORY_LABELS, displayNameFor, priceRange,
  type CreativeCategory,
} from '@/lib/types';
const labelFor = (c: CreativeCategory) => CATEGORY_LABELS[c] ?? c;

// The Today feed is the signed-in home surface. It's read-only: three short
// sections that tell "what's new for you today", then a quick-actions row so
// the primary CTA is always one tap away. Everything defers to /matches,
// /browse, /jobs for the full lists — Today is a summary, not a duplicate.

function greeting(name: string) {
  const h = new Date().getHours();
  const hi = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const first = name.split(/\s+/)[0] || 'there';
  return `${hi}, ${first}`;
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - +new Date(iso)) / 86_400_000);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

function Section({ title, hint, href, hrefLabel, children }: {
  title: string; hint?: string; href?: string; hrefLabel?: string; children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display text-xl">{title}</h2>
          {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
        </div>
        {href && hrefLabel && (
          <Link href={href} className="text-xs font-medium text-sea hover:text-foreground underline underline-offset-4 shrink-0">
            {hrefLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function QuickAction({ href, icon, label, tone = 'neutral' }: {
  href: string; icon: ReactNode; label: string; tone?: 'neutral' | 'accent';
}) {
  const cls = tone === 'accent'
    ? 'border-accent/40 bg-accent-soft text-accent-deep hover:border-accent'
    : 'border-line bg-card text-foreground hover:border-line-strong';
  return (
    <Link href={href} className={`press inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-[border-color,box-shadow] ${cls}`}>
      <span aria-hidden>{icon}</span>{label}
    </Link>
  );
}

type CreativeRow = {
  user_id: string; categories: CreativeCategory[]; neighborhood: string | null;
  rate_min: number | null; rate_max: number | null;
  avatar_url: string | null; users: { display_name: string | null } | null;
};
type JobRow = {
  id: string; title: string; category: CreativeCategory; description: string | null;
  location: string | null; business_id: string;
  budget_min: number | null; budget_max: number | null;
  created_at: string;
  business_profiles: { business_name: string; neighborhood: string | null; is_verified: boolean } | null;
};
type AppRow = {
  id: string; job_id: string | null; creative_id: string; pitch: string | null; created_at: string;
  users: { display_name: string | null } | null;
  creative_profiles: { avatar_url: string | null; neighborhood: string | null; categories: CreativeCategory[] } | null;
};

export async function TodayFeed({
  userId,
  activeRole,
  displayName,
  profileHref,
  creativeCategories,
  businessNeighborhood,
}: {
  userId: string;
  activeRole: 'creative' | 'business';
  displayName: string;
  profileHref: string;
  creativeCategories: CreativeCategory[];
  businessNeighborhood: string | null;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // === Unread messages: last 3 distinct threads ===
  const { data: unread } = await supabase.from('messages')
    .select('id, match_id, body, created_at, sender_id')
    .is('read_at', null).neq('sender_id', userId)
    .order('created_at', { ascending: false }).limit(20);
  const seen = new Set<string>();
  const unreadThreads = (unread ?? []).filter(m => {
    if (!m.match_id || seen.has(m.match_id)) return false;
    seen.add(m.match_id); return true;
  }).slice(0, 3);
  const senderIds = [...new Set(unreadThreads.map(m => m.sender_id).filter(Boolean) as string[])];
  const { data: senders } = senderIds.length
    ? await supabase.from('users').select('id, display_name').in('id', senderIds)
    : { data: [] as { id: string; display_name: string | null }[] };
  const nameById = new Map((senders ?? []).map(s => [s.id, s.display_name]));

  // === Role-specific hero sections ===
  let freshJobs: JobRow[] = [];
  let freshApps: AppRow[] = [];
  let nearbyCreatives: CreativeRow[] = [];
  let myJobTitles = new Map<string, string>();

  if (activeRole === 'creative') {
    let q = supabase.from('jobs')
      .select('*, business_profiles(business_name, neighborhood, is_verified)')
      .eq('status', 'open').order('created_at', { ascending: false }).limit(12);
    if (creativeCategories.length) q = q.in('category', creativeCategories);
    const { data } = await q;
    freshJobs = ((data ?? []) as JobRow[]).slice(0, 4);
  } else {
    const { data: myJobs } = await supabase.from('jobs')
      .select('id, title').eq('business_id', userId).eq('status', 'open');
    (myJobs ?? []).forEach(j => myJobTitles.set(j.id, j.title));
    const jobIds = [...myJobTitles.keys()];
    if (jobIds.length) {
      const { data } = await supabase.from('matches')
        .select('id, job_id, creative_id, pitch, created_at, users:creative_id(display_name), creative_profiles(avatar_url, neighborhood, categories)')
        .in('job_id', jobIds).eq('creative_action', 'liked')
        .order('created_at', { ascending: false }).limit(4);
      freshApps = ((data ?? []) as unknown as AppRow[]);
    }
    let cq = supabase.from('creative_profiles')
      .select('user_id, categories, neighborhood, rate_min, rate_max, currency, avatar_url, users(display_name)')
      .eq('is_public', true).limit(12);
    if (businessNeighborhood) cq = cq.eq('neighborhood', businessNeighborhood);
    const { data: cs } = await cq;
    nearbyCreatives = ((cs ?? []) as unknown as CreativeRow[]).slice(0, 4);
  }

  const hasAnyContent =
    unreadThreads.length > 0 ||
    (activeRole === 'creative' ? freshJobs.length > 0 : freshApps.length > 0 || nearbyCreatives.length > 0);

  return (
    <div className="py-8 space-y-9">
      {/* ===== Header ===== */}
      <div>
        <h1 className="font-display text-3xl md:text-4xl">{greeting(displayName)}</h1>
        <p className="text-muted text-sm mt-1.5">
          {activeRole === 'creative'
            ? 'Here’s what’s new for you today — fresh jobs, unread messages, and next steps.'
            : 'Here’s what’s new today — applications on your jobs, creatives nearby, and next steps.'}
        </p>
      </div>

      {/* ===== Unread messages ===== */}
      {unreadThreads.length > 0 && (
        <Section title="Unread messages" href="/matches" hrefLabel="All conversations →">
          <div className="space-y-2">
            {unreadThreads.map(m => {
              const senderName = displayNameFor(nameById.get(m.sender_id ?? '') ?? null);
              return (
                <Link key={m.id} href={`/messages/${m.match_id}`}
                  className="press flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5
                             hover:border-line-strong hover:shadow-[var(--shadow-sm)]
                             transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)]">
                  <Avatar name={senderName} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{senderName}</p>
                      <span className="text-[11px] text-muted shrink-0 tabular-nums">{timeAgo(m.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted truncate mt-0.5">{m.body ?? '(attachment)'}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-label="unread" />
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* ===== Creative: fresh jobs matching your categories ===== */}
      {activeRole === 'creative' && freshJobs.length > 0 && (
        <Section
          title={creativeCategories.length ? 'New jobs for you' : 'New jobs this week'}
          hint={creativeCategories.length ? `Matching ${creativeCategories.map(labelFor).join(', ')}` : undefined}
          href="/jobs"
          hrefLabel="Browse all jobs →">
          <div className="grid sm:grid-cols-2 gap-3">
            {freshJobs.map(j => (
              <Link key={j.id} href={`/jobs/${j.id}`}
                className="press group block rounded-2xl border border-line bg-card p-4
                           hover:border-line-strong hover:shadow-[var(--shadow-md)]
                           transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)]">
                <div className="flex items-start gap-3">
                  <span className="grid place-items-center h-11 w-11 rounded-xl bg-accent-soft text-accent shrink-0">
                    <CategoryIcon category={j.category} size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate group-hover:underline underline-offset-2">{j.title}</p>
                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5 truncate">
                      {j.business_profiles?.business_name ?? 'A local business'}
                      {j.business_profiles?.is_verified && <VerifiedBadge small />}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                      {priceRange(j.budget_min, j.budget_max) && (
                        <span className="font-semibold text-foreground">{priceRange(j.budget_min, j.budget_max)}</span>
                      )}
                      <span>·</span>
                      <span className="truncate">{j.location ?? j.business_profiles?.neighborhood ?? 'Local'}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* ===== Business: fresh applications ===== */}
      {activeRole === 'business' && freshApps.length > 0 && (
        <Section title="Fresh applicants" href="/jobs/mine" hrefLabel="All my jobs →">
          <div className="space-y-2">
            {freshApps.map(a => {
              const name = displayNameFor(a.users?.display_name);
              const jobTitle = a.job_id ? myJobTitles.get(a.job_id) : null;
              return (
                <Link key={a.id} href={a.job_id ? `/jobs/${a.job_id}/applicants` : '/jobs/mine'}
                  className="press flex items-start gap-3 rounded-2xl border border-line bg-card p-3.5
                             hover:border-line-strong hover:shadow-[var(--shadow-sm)]
                             transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)]">
                  <Avatar name={name} url={a.creative_profiles?.avatar_url} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{name}</p>
                      <span className="text-[11px] text-muted shrink-0 tabular-nums">{timeAgo(a.created_at)}</span>
                    </div>
                    {jobTitle && <p className="text-xs text-muted truncate mt-0.5">applied to <span className="text-foreground">{jobTitle}</span></p>}
                    {a.pitch && <p className="text-sm text-muted line-clamp-2 mt-1">{a.pitch}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* ===== Business: creatives nearby ===== */}
      {activeRole === 'business' && nearbyCreatives.length > 0 && (
        <Section
          title={businessNeighborhood ? `Creatives near ${businessNeighborhood}` : 'Featured creatives'}
          href="/browse" hrefLabel="Browse everyone →">
          <div className="grid sm:grid-cols-2 gap-3">
            {nearbyCreatives.map(c => {
              const name = displayNameFor(c.users?.display_name);
              const rate = priceRange(c.rate_min, c.rate_max);
              return (
                <Link key={c.user_id} href={`/creatives/${c.user_id}`}
                  className="press group flex items-start gap-3 rounded-2xl border border-line bg-card p-4
                             hover:border-line-strong hover:shadow-[var(--shadow-md)]
                             transition-[border-color,box-shadow] duration-200 ease-[var(--ease-out)]">
                  <Avatar name={name} url={c.avatar_url} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate group-hover:text-accent transition-colors">{name}</p>
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {c.neighborhood ?? 'Local'}{rate ? ` · ${rate}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(c.categories ?? []).slice(0, 2).map(x => (
                        <Tag key={x} tone="accent">{labelFor(x)}</Tag>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* ===== Nothing to show yet: warm coaching ===== */}
      {!hasAnyContent && (
        <div className="rounded-3xl border border-line bg-card p-8 text-center">
          <span aria-hidden className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-accent-soft text-accent mb-3">
            <LineIcon name="sparkle" size={26} />
          </span>
          <h2 className="font-display text-xl">You’re all caught up</h2>
          <p className="text-sm text-muted mt-1.5 max-w-md mx-auto">
            {activeRole === 'creative'
              ? 'No new jobs or messages yet. Add a portfolio piece so businesses find you, or browse open jobs.'
              : 'No new applications yet. Post a job or browse local creatives — new ones join every week.'}
          </p>
        </div>
      )}

      {/* ===== Quick actions — the primary "what next?" row ===== */}
      <Section title="Quick actions">
        <div className="flex flex-wrap gap-2">
          {activeRole === 'creative' ? (
            <>
              <QuickAction tone="accent" href="/portfolio" icon={<LineIcon name="star" size={17} />} label="Add a portfolio piece" />
              <QuickAction href="/jobs" icon={<LineIcon name="clipboard" size={17} />} label="Browse open jobs" />
              <QuickAction href={profileHref} icon={<LineIcon name="pin" size={17} />} label="View my profile" />
              <QuickAction href="/matches" icon={<LineIcon name="message" size={17} />} label="Conversations" />
            </>
          ) : (
            <>
              <QuickAction tone="accent" href="/jobs/new" icon={<LineIcon name="clipboard" size={17} />} label="Post a job" />
              <QuickAction href="/browse" icon={<LineIcon name="sparkle" size={17} />} label="Browse creatives" />
              <QuickAction href="/discover" icon={<LineIcon name="star" size={17} />} label="Swipe deck" />
              <QuickAction href="/matches" icon={<LineIcon name="message" size={17} />} label="Conversations" />
            </>
          )}
        </div>
      </Section>
    </div>
  );
}
