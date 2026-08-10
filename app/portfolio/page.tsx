import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { addPortfolioItem, setPortfolioHidden, deletePortfolioItem, setPortfolioFavorite } from '@/lib/actions';
import { getT } from '@/lib/i18n-server';
import { Card, EmptyState, Field, inputCls, Tag } from '@/components/ui';
import { LineIcon, mediaIcon } from '@/components/line-icons';
import type { PortfolioItem } from '@/lib/types';

export default async function PortfolioManager() {
  const { userId, creative, supabase } = await getViewer();
  if (!userId) redirect('/login?role=creative');
  if (!creative) redirect('/onboarding/creative');
  const { t } = await getT();

  const { data: items } = await supabase.from('portfolio_items').select('*').eq('creative_id', userId).order('created_at', { ascending: false });

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl">{t('portfolio.title')}</h1>
      <p className="text-muted text-sm mt-1">{t('portfolio.subtitle')}</p>

      <Card className="p-5 mt-6">
        <h2 className="font-semibold text-sm mb-3">{t('portfolio.addPiece')}</h2>
        <form action={addPortfolioItem} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t('portfolio.uploadLabel')}><input type="file" name="file" accept="image/*,video/*,audio/*" className="text-sm" /></Field>
            <Field label={t('portfolio.orLink')}><input name="url" type="url" className={inputCls} placeholder="https://" /></Field>
          </div>
          <Field label={t('portfolio.caption')}><input name="caption" className={inputCls} placeholder={t('portfolio.captionPlaceholder')} /></Field>
          <Field label={t('portfolio.projectUrl')}><input name="project_url" type="url" className={inputCls} placeholder={t('portfolio.projectUrlPlaceholder')} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t('portfolio.year')}><input name="project_year" inputMode="numeric" maxLength={4} className={inputCls} placeholder="2025" /></Field>
            <Field label={t('portfolio.tags')}><input name="tags" className={inputCls} placeholder={t('portfolio.tagsPlaceholder')} /></Field>
          </div>
          <button className="rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-medium active:scale-[0.97] hover:opacity-90 transition-[transform,opacity] duration-200 ease-[var(--ease-out)]">{t('portfolio.addButton')}</button>
        </form>
      </Card>

      {!(items as PortfolioItem[] | null)?.length ? (
        <EmptyState
          tone="accent"
          icon={<LineIcon name="star" size={30} />}
          title={t('portfolio.emptyTitle')}
          body={t('portfolio.emptyBody')} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 mt-6">
          {(items as PortfolioItem[]).slice()
            .sort((a, b) => Number(b.is_favorite ?? false) - Number(a.is_favorite ?? false))
            .map(p => (
            <Card key={p.id} className={`overflow-hidden ${p.is_hidden ? 'opacity-55' : ''} ${p.is_favorite ? 'border-gold' : ''}`}>
              <div className="relative">
                {p.is_favorite && <span className="absolute top-2 right-2 z-10 rounded-full bg-gold text-white text-xs px-1.5 py-0.5 shadow">{t('portfolio.highlighted')}</span>}
                {p.media_type === 'image' && p.media_url
                  ? <img src={p.media_url} alt={p.caption ?? 'Portfolio piece'} className="h-36 w-full object-cover" />
                  : <div className="h-36 flex items-center justify-center bg-sea-soft text-sea/70"><LineIcon name={mediaIcon(p.media_type, p.source)} size={32} /></div>}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{p.caption ?? t('portfolio.untitled')}</p>
                  {p.source === 'completed_job' && <Tag tone="sea">{t('portfolio.viaCoop')}</Tag>}
                  {p.is_hidden && <Tag>{t('portfolio.hidden')}</Tag>}
                </div>
                {(p.project_year || p.project_url) && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                    {p.project_year && <span>{p.project_year}</span>}
                    {p.project_url && <a href={p.project_url} target="_blank" rel="noopener noreferrer" className="text-sea underline underline-offset-2 hover:text-foreground">{t('portfolio.viewProject')}</a>}
                  </div>
                )}
                {p.tags?.length ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
                  </div>
                ) : null}
                <div className="flex gap-3 mt-2 text-xs flex-wrap">
                  <form action={setPortfolioFavorite.bind(null, p.id, !p.is_favorite)}>
                    <button className="underline underline-offset-2 text-muted hover:text-foreground">{p.is_favorite ? t('portfolio.unhighlight') : t('portfolio.highlight')}</button>
                  </form>
                  <form action={setPortfolioHidden.bind(null, p.id, !p.is_hidden)}>
                    <button className="underline underline-offset-2 text-muted hover:text-foreground">{p.is_hidden ? t('portfolio.showOnProfile') : t('portfolio.hideFromProfile')}</button>
                  </form>
                  <form action={deletePortfolioItem.bind(null, p.id)}>
                    <button className="underline underline-offset-2 text-red-700/70 hover:text-red-700">{t('portfolio.remove')}</button>
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
