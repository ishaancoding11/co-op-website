'use client';

import { useEffect, useRef, useState } from 'react';

const thumbCls =
  'pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white ' +
  '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 ' +
  '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-2 ' +
  '[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab';

/** A budget filter that reads as a single pill in the filter row (same height
 *  as the dropdowns) and reveals a dual-handle slider in an origin-aware
 *  popover. Hidden inputs live at the root — always mounted — so the value
 *  still submits after the popover closes. */
export function PriceFilter({
  nameMin, nameMax, initialMin, initialMax, min = 0, max = 3000, step = 25, label = 'Budget',
}: {
  nameMin: string; nameMax: string; initialMin?: number | null; initialMax?: number | null;
  min?: number; max?: number; step?: number; label?: string;
}) {
  const [lo, setLo] = useState(initialMin ?? min);
  const [hi, setHi] = useState(initialMax ?? max);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const isDefault = lo <= min && hi >= max;
  const summary = isDefault ? `Any ${label.toLowerCase()}` : `$${lo} – $${hi}${hi >= max ? '+' : ''}`;

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={nameMin} value={lo} />
      <input type="hidden" name={nameMax} value={hi} />
      <button
        ref={triggerRef} type="button" aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center justify-between gap-2 rounded-xl border bg-card px-3.5 py-2.5 text-sm text-left transition-colors min-w-[10rem] ${
          isDefault ? 'border-line text-foreground hover:border-accent/50' : 'border-accent/60 text-accent'
        }`}
      >
        <span className="truncate font-medium">{summary}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" aria-hidden
          className={`shrink-0 text-muted transition-transform duration-200 ease-[var(--ease-out)] ${open ? '-rotate-180' : ''}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="dialog" aria-label={`${label} range`}
          className="animate-pop origin-top absolute left-0 z-50 mt-2 w-72 rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-lg)]">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-lg" aria-live="polite">${lo} – ${hi}{hi >= max ? '+' : ''}</span>
            {!isDefault && (
              <button type="button" onClick={() => { setLo(min); setHi(max); }}
                className="text-xs text-muted hover:text-accent transition-colors">Reset</button>
            )}
          </div>
          <div className="relative h-5 mx-2.5 mt-4">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-line" />
            <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-accent"
              style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }} />
            <input type="range" aria-label={`Minimum ${label} in dollars`} min={min} max={max} step={step} value={lo}
              onChange={e => setLo(Math.min(Number(e.target.value), hi - step))} className={thumbCls} />
            <input type="range" aria-label={`Maximum ${label} in dollars`} min={min} max={max} step={step} value={hi}
              onChange={e => setHi(Math.max(Number(e.target.value), lo + step))} className={thumbCls} />
          </div>
          <div className="flex justify-between text-[11px] text-muted mt-2">
            <span>${min}</span><span>${max}+</span>
          </div>
        </div>
      )}
    </div>
  );
}
