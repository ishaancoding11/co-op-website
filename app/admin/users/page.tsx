import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getStaffRole } from '@/lib/auth';
import { Card, Tag, Rating, EmptyState } from '@/components/ui';
import { CATEGORY_LABELS, type CreativeCategory } from '@/lib/types';
import { PLAN_LABELS } from '@/lib/plans';
import { ActionNotice, AdminStatusBadge, BannedEmails, DeleteBanForm, Metric, Pager, SearchBar, StatusForm, type BannedRow } from '../admin-ui';

type CreativeRow = {
  user_id: string; display_name: string; neighborhood: string | null; categories: CreativeCategory[];
  status: string; plan: keyof typeof PLAN_LABELS | null; rating_avg: number | null; rating_count: number; joined_at: string;
};
type BusinessRow = {
  user_id: string; business_name: string; neighborhood: string | null; is_verified: boolean;
  status: string; plan: keyof typeof PLAN_LABELS | null; jobs_published: number; joined_at: string;
};

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ kind?: string; q?: string; page?: string; notice?: string; target?: string }> }) {
  const { kind: kindParam, q, page: pageParam, notice, target: noticeTarget } = await searchParams;
  const kind = kindParam === 'business' ? 'business' : kindParam === 'banned' ? 'banned' : 'creative';
  const page = Math.max(1, Number(pageParam) || 1);
  const perPage = 50;
  const search = q?.trim() || null;

  const [{ staffRole }, cookieStore] = await Promise.all([getStaffRole(), cookies()]);
  const isAdmin = staffRole === 'admin';
  const supabase = createClient(cookieStore);

  const { data, error } = kind === 'creative'
    ? await supabase.rpc('admin_creatives', { p_search: search, p_limit: perPage, p_offset: (page - 1) * perPage })
    : kind === 'business'
    ? await supabase.rpc('admin_businesses', { p_search: search, p_limit: perPage, p_offset: (page - 1) * perPage })
    : await supabase.rpc('admin_banned_emails', { p_limit: perPage, p_offset: (page - 1) * perPage });

  const creatives = kind === 'creative' ? ((data ?? []) as CreativeRow[]) : [];
  const businesses = kind === 'business' ? ((data ?? []) as BusinessRow[]) : [];
  const banned = kind === 'banned' ? ((data ?? []) as BannedRow[]) : [];

  const dismissSp = new URLSearchParams({ kind, ...(q ? { q } : {}), ...(page > 1 ? { page: String(page) } : {}) });
  const dismissHref = `?${dismissSp}`;

  return (
    <div>
      <div className="flex gap-1 mb-4">
        <Link href="/admin/users?kind=creative" className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${kind === 'creative' ? 'bg-foreground text-background' : 'text-muted hover:bg-line/50'}`}>Creatives</Link>
        <Link href="/admin/users?kind=business" className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${kind === 'business' ? 'bg-foreground text-background' : 'text-muted hover:bg-line/50'}`}>Businesses</Link>
        <Link href="/admin/users?kind=banned" className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${kind === 'banned' ? 'bg-foreground text-background' : 'text-muted hover:bg-line/50'}`}>Banned</Link>
      </div>

      <ActionNotice notice={notice} target={noticeTarget} dismissHref={dismissHref} />

      {kind !== 'banned' && <SearchBar action="/admin/users" value={q} placeholder={`Search ${kind}s by name…`} hidden={{ kind }} />}

      {error ? <p className="text-sm text-red-700 mt-4">Could not load the list.</p> : null}

      {kind === 'creative' ? (
        !creatives.length ? <EmptyState title={search ? 'Nobody matches that search' : 'No creatives yet'} /> : (
          <div className="space-y-3 mt-4">
            {creatives.map(c => (
              <Card key={c.user_id} className="p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={`/creatives/${c.user_id}`} className="font-semibold hover:underline underline-offset-2">{c.display_name}</Link>
                  <AdminStatusBadge status={c.status} />
                  <span className="text-xs text-muted">{c.neighborhood ?? 'No location'} · joined {new Date(c.joined_at).toLocaleDateString('en-US')}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(c.categories ?? []).map(cat => <Tag key={cat} tone="accent">{CATEGORY_LABELS[cat]}</Tag>)}
                  <Tag tone="sea">{c.plan ? PLAN_LABELS[c.plan] : 'Trial / expired'}</Tag>
                </div>
                <div className="mt-3"><Rating value={c.rating_avg} count={c.rating_count || undefined} /></div>
                {isAdmin && <StatusForm userId={c.user_id} status={c.status} target={c.display_name} kind={kind} q={q} page={page} />}
                {isAdmin && <DeleteBanForm userId={c.user_id} target={c.display_name} kind={kind} q={q} page={page} />}
              </Card>
            ))}
          </div>
        )
      ) : kind === 'business' ? (
        !businesses.length ? <EmptyState title={search ? 'Nobody matches that search' : 'No businesses yet'} /> : (
          <div className="space-y-3 mt-4">
            {businesses.map(b => (
              <Card key={b.user_id} className="p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={`/business/${b.user_id}`} className="font-semibold hover:underline underline-offset-2">{b.business_name}</Link>
                  <AdminStatusBadge status={b.is_verified ? 'verified' : 'unverified'} />
                  {b.status !== 'active' && <AdminStatusBadge status={b.status} />}
                  <span className="text-xs text-muted">{b.neighborhood ?? 'No location'} · joined {new Date(b.joined_at).toLocaleDateString('en-US')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-3">
                  <Metric label="Jobs published" value={String(b.jobs_published)} />
                  <Metric label="Plan" value={b.plan ? PLAN_LABELS[b.plan] : 'Trial / expired'} />
                </div>
                {isAdmin && <StatusForm userId={b.user_id} status={b.status} target={b.business_name} kind={kind} q={q} page={page} />}
                {isAdmin && <DeleteBanForm userId={b.user_id} target={b.business_name} kind={kind} q={q} page={page} />}
              </Card>
            ))}
          </div>
        )
      ) : (
        <BannedEmails rows={banned} isAdmin={isAdmin} />
      )}

      {kind !== 'banned' && (
        <Pager page={page} count={kind === 'creative' ? creatives.length : businesses.length} perPage={perPage} extraParams={{ kind, ...(q ? { q } : {}) }} />
      )}
    </div>
  );
}
