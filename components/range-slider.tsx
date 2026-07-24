'use client';

import { useState } from 'react';

const thumbCls =
  'pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none ' +
  '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white ' +
  '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 ' +
  '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-2 ' +
  '[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab';

/** Dual-handle range slider. Renders two hidden inputs (nameMin/nameMax) for form submission. */
export function RangeSlider({
  min = 0, max = 3000, step = 25, initialMin, initialMax, nameMin, nameMax, label = 'Range',
}: {
  min?: number; max?: number; step?: number; initialMin?: number | null; initialMax?: number | null;
  nameMin: string; nameMax: string; label?: string;
}) {
  const [lo, setLo] = useState(initialMin ?? Math.round((min + (max - min) * 0.1) / step) * step);
  const [hi, setHi] = useState(initialMax ?? Math.round((min + (max - min) * 0.4) / step) * step);
  const pct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div>
      <p className="text-sm font-semibold mb-3" aria-live="polite">
        ${lo} – ${hi}{hi >= max ? '+' : ''}
      </p>
      <div className="relative h-5 mx-2.5">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-line" />
        <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-accent"
          style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }} />
        <input type="range" aria-label={`Minimum ${label} in dollars`} min={min} max={max} step={step} value={lo}
          onChange={e => setLo(Math.min(Number(e.target.value), hi - step))} className={thumbCls} />
        <input type="range" aria-label={`Maximum ${label} in dollars`} min={min} max={max} step={step} value={hi}
          onChange={e => setHi(Math.max(Number(e.target.value), lo + step))} className={thumbCls} />
      </div>
      <div className="flex justify-between text-[11px] text-muted mt-1.5">
        <span>${min}</span><span>${max}+</span>
      </div>
      <input type="hidden" name={nameMin} value={lo} />
      <input type="hidden" name={nameMax} value={hi} />
    </div>
  );
}
