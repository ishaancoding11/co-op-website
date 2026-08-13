import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { ViewToggle } from './view-toggle';
import { GalleryView } from './gallery-view';
import { ListView } from './list-view';

export default async function Browse({ searchParams }: {
  searchParams: Promise<{ view?: string; category?: string; neighborhood?: string; price_min?: string; price_max?: string; min_rating?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === 'list' ? 'list' : 'gallery';

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  const preserveParams = new URLSearchParams();
  if (sp.category) preserveParams.set('category', sp.category);
  if (sp.neighborhood) preserveParams.set('neighborhood', sp.neighborhood);
  if (sp.price_min) preserveParams.set('price_min', sp.price_min);
  if (sp.price_max) preserveParams.set('price_max', sp.price_max);
  if (sp.min_rating) preserveParams.set('min_rating', sp.min_rating);
  if (sp.q) preserveParams.set('q', sp.q);

  return (
    <div className="py-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-display text-3xl">{sp.q ? `Results for “${sp.q}”` : 'Browse local creatives'}</h1>
        <ViewToggle active={view} preserveParams={preserveParams.toString()} />
      </div>

      {view === 'gallery'
        ? <GalleryView signedIn={!!user} />
        : <ListView searchParams={sp} />}
    </div>
  );
}
