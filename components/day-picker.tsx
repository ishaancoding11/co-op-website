'use client';

import { useState } from 'react';
import { WEEKDAYS } from '@/lib/types';

export function DayPicker({ initial = [], name = 'available_days' }: { initial?: string[]; name?: string }) {
  const [picked, setPicked] = useState<string[]>(initial);
  const toggle = (k: string) => setPicked(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]);
  return (
    <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Days of the week you're available">
      {WEEKDAYS.map(d => (
        <button type="button" key={d.key} onClick={() => toggle(d.key)} aria-pressed={picked.includes(d.key)}
          className={`w-12 rounded-xl border py-2 text-xs font-semibold transition-colors ${picked.includes(d.key) ? 'bg-sea text-white border-sea' : 'bg-card border-line text-muted hover:border-sea/50'}`}>
          {d.label}
        </button>
      ))}
      {picked.map(k => <input key={k} type="hidden" name={name} value={k} />)}
    </div>
  );
}
