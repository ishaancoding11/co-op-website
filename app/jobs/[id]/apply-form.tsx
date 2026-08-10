'use client';

import { useActionState, useState } from 'react';
import { applyToJob } from '@/lib/actions';
import { inputCls } from '@/components/ui';
import { LineIcon, mediaIcon } from '@/components/line-icons';
import type { PortfolioItem } from '@/lib/types';

export function ApplyForm({ jobId, businessId, portfolio }: { jobId: string; businessId: string; portfolio: PortfolioItem[] }) {
  const [state, action, pending] = useActionState(applyToJob, {});
  const [picked, setPicked] = useState<string[]>(portfolio.filter(p => p.is_favorite).map(p => p.id));
  const toggle = (pid: string) => setPicked(p => p.includes(pid) ? p.filter(x => x !== pid) : [...p, pid]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="business_id" value={businessId} />

      <div>
        <p className="text-sm font-medium mb-1.5">Pick portfolio pieces to share <span className="text-muted font-normal">({picked.length} selected)</span></p>
        {portfolio.length === 0 ? (
          <p className="text-xs text-muted rounded-xl bg-background px-3.5 py-2.5">
            No portfolio pieces yet — you can still apply, but adding work to your Portfolio first makes a much stronger application.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="group" aria-label="Select portfolio pieces to attach">
            {portfolio.map(p => {
              const selected = picked.includes(p.id);
              return (
                <button type="button" key={p.id} onClick={() => toggle(p.id)} aria-pressed={selected}
                  className={`relative rounded-xl overflow-hidden border-2 text-left transition-colors ${selected ? 'border-accent' : 'border-line hover:border-accent/40'}`}>
                  {selected && <span className="absolute top-1 right-1 z-10 h-5 w-5 rounded-full bg-accent text-white text-xs flex items-center justify-center">✓</span>}
                  {p.media_type === 'image' && p.media_url
                    ? <img src={p.media_url} alt={p.caption ?? 'Portfolio piece'} className="h-20 w-full object-cover" />
                    : <div className="h-20 flex items-center justify-center bg-sea-soft text-sea/70"><LineIcon name={mediaIcon(p.media_type)} size={22} /></div>}
                  <span className="block px-1.5 py-1 text-[10px] text-muted truncate">{p.is_favorite ? '★ ' : ''}{p.caption ?? 'Untitled'}</span>
                </button>
              );
            })}
          </div>
        )}
        {picked.map(pid => <input key={pid} type="hidden" name="portfolio_ids" value={pid} />)}
      </div>

      <label className="block">
        <span className="block text-sm font-medium mb-1.5">Short note <span className="text-muted font-normal">(optional)</span></span>
        <textarea name="pitch" rows={2} className={inputCls} placeholder="Anything worth adding — availability, a relevant idea…" />
      </label>

      {state?.error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2.5">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-full bg-foreground text-background py-3 text-sm font-medium active:scale-[0.97] hover:opacity-90 transition-[transform,opacity] duration-200 ease-[var(--ease-out)] disabled:opacity-40">
        {pending ? 'Sending…' : 'Apply'}
      </button>
    </form>
  );
}
