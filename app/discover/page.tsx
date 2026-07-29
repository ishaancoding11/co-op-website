import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { EmptyState, LinkButton } from '@/components/ui';
import { SwipeDeck, type DeckCard } from './swipe-deck';
import { CATEGORY_LABELS, displayNameFor, priceRange, type CreativeCategory } from '@/lib/types';

export default async function Discover() {
  const { userId, business, supabase } = await getViewer();
  if (!userId) redirect('/login?role=business');
  if (!business) redirect('/onboarding/business');

  const { data: acted } = await supabase.from('matches')
    .select('creative_id, business_action').eq('business_id', userId).not('business_action', 'is', null);
  const excluded = new Set((acted ?? []).map(m => m.creative_id));

  const { data: creatives } = await supabase.from('creative_profiles')
    .select('*, users(display_name)').eq('is_public', true).neq('user_id', userId).limit(50);

  const deck = (creatives ?? []).filter(c => !excluded.has(c.user_id));
  const ids = deck.map(c => c.user_id);

  const [{ data: reviews }, { data: portfolios }] = await Promise.all([
    ids.length ? supabase.from('reviews').select('reviewee_id, stars').in('reviewee_id', ids) : Promise.resolve({ data: [] as { reviewee_id: string; stars: number }[] }),
    ids.length ? supabase.from('portfolio_items').select('creative_id, media_url, media_type, caption').in('creative_id', ids).eq('is_hidden', false) : Promise.resolve({ data: [] as { creative_id: string; media_url: string | null; media_type: string; caption: string | null }[] }),
  ]);

  const cards: DeckCard[] = deck.map(c => {
    const rs = (reviews ?? []).filter(r => r.reviewee_id === c.user_id);
    const hero = (portfolios ?? []).find(p => p.creative_id === c.user_id && p.media_type === 'image' && p.media_url);
    return {
      id: c.user_id,
      name: displayNameFor((c.users as { display_name: string | null } | null)?.display_name),
      categories: (c.categories as CreativeCategory[]).map(x => CATEGORY_LABELS[x]),
      neighborhood: c.neighborhood,
      bio: c.bio,
      price: priceRange(c.rate_min, c.rate_max),
      rating: rs.length ? rs.reduce((s, r) => s + r.stars, 0) / rs.length : null,
      reviewCount: rs.length,
      heroUrl: hero?.media_url ?? null,
      avatarUrl: c.avatar_url,
    };
  });

  return (
    <div className="py-8">
      <div className="text-center mb-6">
        <h1 className="font-display text-3xl">Discover creatives</h1>
        <p className="text-muted text-sm mt-1">Swipe right to say you&rsquo;re interested · left to pass · tap the card for the full profile</p>
      </div>
      {cards.length === 0 ? (
        <EmptyState title="You’ve seen everyone nearby (for now)"
          body="New creatives join all the time. Meanwhile, try browsing with filters or post a job so creatives come to you."
          action={<div className="flex gap-3 justify-center"><LinkButton href="/browse" variant="ghost">Browse all</LinkButton><LinkButton href="/jobs/new">Post a job</LinkButton></div>} />
      ) : (
        <SwipeDeck cards={cards} />
      )}
    </div>
  );
}
