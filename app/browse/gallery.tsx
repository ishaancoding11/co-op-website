'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { loadGalleryPage, type GalleryCursor, type GalleryItem } from '@/lib/gallery-actions';

export function Gallery({ initialItems, initialCursor, signedIn }: {
  initialItems: GalleryItem[]; initialCursor: GalleryCursor | null; signedIn: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  // Signed-out visitors get the same static preview as the list view — no
  // infinite scroll at all, matching the existing "join free to see
  // everyone" pattern rather than a new gate.
  const [hasMore, setHasMore] = useState(signedIn && initialCursor !== null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && !loadingRef.current) loadMore();
    }, { rootMargin: '600px' });
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, cursor]);

  async function loadMore() {
    loadingRef.current = true;
    setLoading(true);
    const { items: next, nextCursor } = await loadGalleryPage(cursor);
    setItems(prev => [...prev, ...next]);
    setCursor(nextCursor);
    setHasMore(nextCursor !== null && next.length > 0);
    setLoading(false);
    loadingRef.current = false;
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted text-center py-16">No portfolio pieces to show yet — check back soon.</p>;
  }

  return (
    <>
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 mt-6">
        {items.map(item => (
          <Link key={item.id} href={`/creatives/${item.creativeId}`}
            className="group relative mb-3 block break-inside-avoid overflow-hidden rounded-xl bg-line">
            <img src={item.mediaUrl} alt="" loading="lazy" className="block h-auto w-full" />
            <span className={`absolute inset-x-0 bottom-0 px-2.5 py-2 bg-gradient-to-t from-black/75 to-transparent transition-opacity ${
              // Always visible on touch/mobile (no hover state to rely on); hover-reveal on desktop.
              'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
            }`}>
              <span className="block truncate text-xs font-semibold text-white">{item.creativeName}</span>
              {item.category && <span className="block truncate text-[11px] text-white/80">{item.category}</span>}
            </span>
          </Link>
        ))}
      </div>

      {hasMore && <div ref={sentinelRef} aria-hidden className="h-10" />}
      {loading && <p className="text-center text-sm text-muted py-4">Loading more…</p>}

      {!signedIn && (
        <div className="rounded-3xl border border-line bg-card p-8 mt-6 text-center">
          <h2 className="font-display text-xl">See every creative&rsquo;s full portfolio</h2>
          <p className="text-sm text-muted mt-1">Join free to keep scrolling, match, and message directly.</p>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            <Link href="/login?role=business" className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-85">Get started as a business</Link>
            <Link href="/login?role=creative" className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-85">Get started as a creative</Link>
          </div>
        </div>
      )}
    </>
  );
}
