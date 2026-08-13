'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { CATEGORY_LABELS, displayNameFor, type CreativeCategory } from '@/lib/types';

export type GalleryItem = {
  id: string;
  creativeId: string;
  mediaUrl: string;
  creativeName: string;
  category: string | null;
  avatarUrl: string | null;
};

export type GalleryCursor = { createdAt: string; id: string };

const PAGE_SIZE = 24;

/**
 * One page of the visual discovery gallery — individual portfolio pieces
 * from across every public creative, mixed together (not grouped by
 * creative). Called both server-side for the first page (gallery-view.tsx)
 * and imperatively from the client for infinite scroll (gallery.tsx) — a
 * Server Action works for both without a separate API route.
 *
 * Deliberately two queries, not one embedded select: portfolio_items.creative_id
 * is a not-null FK, so embedding creative_profiles/users through it resolves
 * as an inner join — if either row's RLS ever hid the embedded side for any
 * reason, the whole outer row would silently vanish instead of just missing
 * a name. This codebase has hit that exact bug more than once, so every read
 * here stays decoupled on purpose.
 *
 * Keyset pagination (WHERE (created_at, id) < cursor), not OFFSET — offset
 * pagination can duplicate or skip items if new portfolio pieces are
 * uploaded by anyone while a visitor is mid-scroll; a keyset cursor can't.
 */
export async function loadGalleryPage(cursor: GalleryCursor | null): Promise<{ items: GalleryItem[]; nextCursor: GalleryCursor | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let q = supabase.from('portfolio_items')
    .select('id, creative_id, media_url, created_at')
    .eq('is_hidden', false)
    .eq('media_type', 'image')
    .not('media_url', 'is', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) {
    q = q.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data: rows, error } = await q;
  if (error) {
    console.error('[gallery] loadGalleryPage query failed:', error.message);
    return { items: [], nextCursor: null };
  }
  if (!rows || rows.length === 0) return { items: [], nextCursor: null };

  const creativeIds = [...new Set(rows.map(r => r.creative_id))];
  const [{ data: profiles }, { data: users }] = await Promise.all([
    supabase.from('creative_profiles').select('user_id, categories, avatar_url').in('user_id', creativeIds),
    supabase.from('users').select('id, display_name').in('id', creativeIds),
  ]);
  const profileById = new Map((profiles ?? []).map(p => [p.user_id, p]));
  const nameById = new Map((users ?? []).map(u => [u.id, u.display_name as string | null]));

  const items: GalleryItem[] = rows
    .filter(r => !!r.media_url)
    .map(r => {
      const profile = profileById.get(r.creative_id);
      const categories = (profile?.categories ?? []) as CreativeCategory[];
      return {
        id: r.id as string,
        // The link target for every tile — taken straight from this row's
        // own not-null creative_id column, never from the portfolio item's
        // own id or anything joined in above. That's the whole correctness
        // guarantee: no lookup between here and the <Link> can substitute
        // the wrong person.
        creativeId: r.creative_id as string,
        mediaUrl: r.media_url as string,
        creativeName: displayNameFor(nameById.get(r.creative_id)),
        category: categories[0] ? CATEGORY_LABELS[categories[0]] : null,
        avatarUrl: profile?.avatar_url ?? null,
      };
    });

  const last = rows[rows.length - 1];
  const nextCursor = rows.length === PAGE_SIZE ? { createdAt: last.created_at as string, id: last.id as string } : null;

  return { items, nextCursor };
}
