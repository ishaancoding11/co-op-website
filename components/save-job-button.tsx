'use client';

import { useState, useTransition } from 'react';
import { toggleFavorite } from '@/lib/actions';

export function SaveJobButton({ jobId, initialSaved, className = '' }: { jobId: string; initialSaved: boolean; className?: string }) {
  const [saved, setSaved] = useState(initialSaved);
  const [, startTransition] = useTransition();
  return (
    <button
      aria-label={saved ? 'Remove job from saved' : 'Save job for later'} aria-pressed={saved}
      onClick={e => {
        e.preventDefault(); e.stopPropagation();
        setSaved(s => !s);
        startTransition(() => toggleFavorite('job', jobId, '/jobs'));
      }}
      className={`h-9 w-9 rounded-full flex items-center justify-center text-lg transition-colors ${saved ? 'bg-accent-soft text-accent' : 'bg-card border border-line text-muted hover:text-accent hover:border-accent/40'} ${className}`}>
      {saved ? '♥' : '♡'}
    </button>
  );
}
