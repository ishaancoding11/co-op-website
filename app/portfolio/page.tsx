import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { addPortfolioItem, setPortfolioHidden, deletePortfolioItem, setPortfolioFavorite } from '@/lib/actions';
import { Card, EmptyState, Field, inputCls, Tag } from '@/components/ui';
import type { PortfolioItem } from '@/lib/types';

export default async function PortfolioManager() {
  const { userId, creative, supabase } = await getViewer();
  if (!userId) redirect('/login?role=creative');
  if (!creative) redirect('/onboarding/creative');

  const { data: items } = await supabase.from('portfolio_items').select('*').eq('creative_id', userId).order('created_at', { ascending: false });

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl">Portfolio</h1>
      <p className="text-muted text-sm mt-1">What businesses see when they discover you — add as many pieces as you like. Star your best work to show it first, and hide anything you&rsquo;d rather not show. Completed Co-op jobs land here automatically.</p>

      <Card className="p-5 mt-6">
        <h2 className="font-semibold text-sm mb-3">Add a piece</h2>
        <form action={addPortfolioItem} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Upload image / video / audio"><input type="file" name="file" accept="image/*,video/*,audio/*" className="text-sm" /></Field>
            <Field label="…or paste a link"><input name="url" type="url" className={inputCls} placeholder="https://" /></Field>
          </div>
          <Field label="Caption"><input name="caption" className={inputCls} placeholder="e.g. Latte art series — Drift Coffee" /></Field>
          <button className="rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-medium hover:opacity-85">Add to portfolio</button>
        </form>
      </Card>

      {!(items as PortfolioItem[] | null)?.length ? (
        <EmptyState title="No pieces yet" body="Profiles with visuals get far more matches — start with your strongest work and keep adding." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 mt-6">
          {(items as PortfolioItem[]).slice()
            .sort((a, b) => Number(b.is_favorite ?? false) - Number(a.is_favorite ?? false))
            .map(p => (
            <Card key={p.id} className={`overflow-hidden ${p.is_hidden ? 'opacity-55' : ''} ${p.is_favorite ? 'border-gold' : ''}`}>
              <div className="relative">
                {p.is_favorite && <span className="absolute top-2 right-2 z-10 rounded-full bg-gold text-white text-xs px-1.5 py-0.5 shadow">★ highlighted</span>}
                {p.media_type === 'image' && p.media_url
                  ? <img src={p.media_url} alt={p.caption ?? 'Portfolio piece'} className="h-36 w-full object-cover" />
                  : <div className="h-36 flex items-center justify-center text-3xl bg-sea-soft" aria-hidden>{p.media_type === 'video' ? '🎬' : p.media_type === 'audio' ? '🎵' : p.source === 'completed_job' ? '✅' : '🔗'}</div>}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{p.caption ?? 'Untitled'}</p>
                  {p.source === 'completed_job' && <Tag tone="sea">via Co-op</Tag>}
                  {p.is_hidden && <Tag>hidden</Tag>}
                </div>
                <div className="flex gap-3 mt-2 text-xs flex-wrap">
                  <form action={setPortfolioFavorite.bind(null, p.id, !p.is_favorite)}>
                    <button className="underline underline-offset-2 text-muted hover:text-foreground">{p.is_favorite ? '★ Un-highlight' : '☆ Highlight'}</button>
                  </form>
                  <form action={setPortfolioHidden.bind(null, p.id, !p.is_hidden)}>
                    <button className="underline underline-offset-2 text-muted hover:text-foreground">{p.is_hidden ? 'Show on profile' : 'Hide from profile'}</button>
                  </form>
                  <form action={deletePortfolioItem.bind(null, p.id)}>
                    <button className="underline underline-offset-2 text-red-700/70 hover:text-red-700">Remove</button>
                  </form>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
