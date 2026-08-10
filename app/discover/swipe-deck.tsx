'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { businessAct } from '@/lib/actions';
import { Rating, Tag, Avatar } from '@/components/ui';

export type DeckCard = {
  id: string; name: string; categories: string[]; neighborhood: string | null;
  bio: string | null; price: string | null; rating: number | null; reviewCount: number;
  heroUrl: string | null; avatarUrl: string | null;
};

export function SwipeDeck({ cards }: { cards: DeckCard[] }) {
  const [index, setIndex] = useState(0);
  const [matchWith, setMatchWith] = useState<DeckCard | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const act = (card: DeckCard, action: 'liked' | 'passed') => {
    setIndex(i => i + 1);
    startTransition(async () => {
      const res = await businessAct(card.id, action);
      if (res?.matched) setMatchWith(card);
    });
  };

  const current = cards[index];
  const nextCard = cards[index + 1];

  return (
    <div className="relative mx-auto w-full max-w-sm" style={{ height: 560 }}>
      {!current && (
        <div className="absolute inset-0 flex items-center justify-center text-center px-8">
          <p className="text-muted">That&rsquo;s everyone for now — check back soon</p>
        </div>
      )}
      {nextCard && <StaticCard card={nextCard} />}
      {current && (
        <DraggableCard key={current.id} card={current}
          onSwipe={a => act(current, a)}
          onOpen={() => router.push(`/creatives/${current.id}`)} />
      )}

      {current && (
        <div className="absolute -bottom-20 inset-x-0 flex items-center justify-center gap-6">
          <button aria-label={`Pass on ${current.name}`} onClick={() => act(current, 'passed')}
            className="h-14 w-14 rounded-full bg-card border border-line shadow-md text-2xl hover:scale-105 transition-transform">✕</button>
          <button aria-label={`Interested in ${current.name}`} onClick={() => act(current, 'liked')}
            className="h-16 w-16 rounded-full bg-accent text-white shadow-lg text-2xl hover:scale-105 transition-transform">♥</button>
        </div>
      )}

      <AnimatePresence>
        {matchWith && <MatchOverlay card={matchWith} onClose={() => setMatchWith(null)} />}
      </AnimatePresence>
    </div>
  );
}

function CardBody({ card }: { card: DeckCard }) {
  return (
    <>
      <div className="h-[58%] bg-line relative">
        {card.heroUrl
          ? <img src={card.heroUrl} alt={`Portfolio work by ${card.name}`} className="h-full w-full object-cover" />
          : <div className="h-full w-full flex items-center justify-center"><Avatar name={card.name} url={card.avatarUrl} size={96} /></div>}
        {card.price && <span className="absolute bottom-3 left-3 rounded-lg bg-foreground/85 text-background px-2.5 py-1 text-xs font-semibold backdrop-blur">from {card.price.split('–')[0]}</span>}
      </div>
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl truncate">{card.name}</h2>
          <Rating value={card.rating} count={card.reviewCount || undefined} />
        </div>
        <p className="text-sm text-muted mt-0.5">{card.neighborhood ?? 'Newport Beach area'}</p>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {card.categories.map(c => <Tag key={c} tone="accent">{c}</Tag>)}
        </div>
        {card.bio && <p className="text-sm text-muted mt-3 line-clamp-2">{card.bio}</p>}
      </div>
    </>
  );
}

function StaticCard({ card }: { card: DeckCard }) {
  return (
    <div className="absolute inset-0 rounded-3xl bg-card border border-line overflow-hidden scale-[0.96] translate-y-2 opacity-70" aria-hidden>
      <CardBody card={card} />
    </div>
  );
}

function DraggableCard({ card, onSwipe, onOpen }: { card: DeckCard; onSwipe: (a: 'liked' | 'passed') => void; onOpen: () => void }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-14, 14]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const passOpacity = useTransform(x, [-140, -40], [1, 0]);

  return (
    <motion.div
      className="absolute inset-0 rounded-3xl bg-card border border-line shadow-[0_8px_40px_rgba(45,42,38,0.12)] overflow-hidden cursor-grab active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120) onSwipe('liked');
        else if (info.offset.x < -120) onSwipe('passed');
      }}
      onClick={(e) => { if (Math.abs(x.get()) < 5) onOpen(); }}
      initial={{ scale: 0.96, y: 8, opacity: 0.8 }} animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      role="button" tabIndex={0} aria-label={`${card.name} — open profile. Use the buttons below to pass or like.`}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(); if (e.key === 'ArrowRight') onSwipe('liked'); if (e.key === 'ArrowLeft') onSwipe('passed'); }}
    >
      <motion.div style={{ opacity: likeOpacity }} className="absolute top-6 left-6 z-10 rotate-[-12deg] rounded-xl border-4 border-accent text-accent px-3 py-1 font-display text-2xl">INTERESTED</motion.div>
      <motion.div style={{ opacity: passOpacity }} className="absolute top-6 right-6 z-10 rotate-[12deg] rounded-xl border-4 border-muted text-muted px-3 py-1 font-display text-2xl">PASS</motion.div>
      <CardBody card={card} />
    </motion.div>
  );
}

function MatchOverlay({ card, onClose }: { card: DeckCard; onClose: () => void }) {
  const router = useRouter();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/70 backdrop-blur-sm flex items-center justify-center p-6"
      role="dialog" aria-modal="true" aria-label="It's a match">
      <motion.div initial={{ scale: 0.7, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', bounce: 0.45 }}
        className="bg-card rounded-3xl p-8 text-center max-w-xs w-full">
        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', bounce: 0.6 }} className="text-5xl" aria-hidden>🎉</motion.p>
        <h2 className="font-display text-3xl mt-3 text-accent">It&rsquo;s a match!</h2>
        <p className="text-sm text-muted mt-2">{card.name} liked you too. Your DM thread is now open.</p>
        <div className="mt-6 flex flex-col gap-2">
          <button onClick={() => router.push('/matches')} className="rounded-full bg-accent text-white py-2.5 text-sm font-medium hover:opacity-85">Send a message</button>
          <button onClick={onClose} className="rounded-full border border-line py-2.5 text-sm font-medium hover:bg-background">Keep swiping</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
