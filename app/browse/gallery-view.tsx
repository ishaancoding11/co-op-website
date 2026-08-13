import { loadGalleryPage } from '@/lib/gallery-actions';
import { Gallery } from './gallery';

const SIGNED_OUT_PREVIEW = 6;

export async function GalleryView({ signedIn }: { signedIn: boolean }) {
  const { items, nextCursor } = await loadGalleryPage(null);
  // Matches the list view's existing signed-out preview pattern — a static
  // cap, not a partial infinite scroll that quietly cuts off mid-load.
  const initialItems = signedIn ? items : items.slice(0, SIGNED_OUT_PREVIEW);

  return <Gallery initialItems={initialItems} initialCursor={nextCursor} signedIn={signedIn} />;
}
