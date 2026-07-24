'use client';

import { useState } from 'react';

export function CategoryPicker({ all, labels, initial, name }: {
  all: string[]; labels: Record<string, string>; initial: string[]; name: string;
}) {
  const [picked, setPicked] = useState<string[]>(initial);
  const toggle = (c: string) => setPicked(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {all.map(c => (
        <button type="button" key={c} onClick={() => toggle(c)} aria-pressed={picked.includes(c)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${picked.includes(c) ? 'bg-foreground text-background border-foreground' : 'bg-card border-line text-muted hover:border-foreground/40'}`}>
          {labels[c]}
        </button>
      ))}
      {picked.map(c => <input key={c} type="hidden" name={name} value={c} />)}
    </div>
  );
}
