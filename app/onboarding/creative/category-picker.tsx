'use client';

import { useEffect, useRef, useState } from 'react';

export function CategoryPicker({ all, labels, initial, name }: {
  all: string[]; labels: Record<string, string>; initial: string[]; name: string;
}) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [error, setError] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggle = (c: string) => { setPicked(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]); setError(false); };

  useEffect(() => {
    const form = rootRef.current?.closest('form');
    if (!form) return;
    const onSubmit = (e: SubmitEvent) => { if (picked.length === 0) { e.preventDefault(); setError(true); } };
    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, [picked]);

  return (
    <div ref={rootRef}>
      <div className="flex flex-wrap gap-2" role="group">
        {all.map(c => (
          <button type="button" key={c} onClick={() => toggle(c)} aria-pressed={picked.includes(c)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${picked.includes(c) ? 'bg-foreground text-background border-foreground' : 'bg-card border-line text-muted hover:border-foreground/40'}`}>
            {labels[c]}
          </button>
        ))}
        {picked.map(c => <input key={c} type="hidden" name={name} value={c} />)}
      </div>
      {error && <p role="alert" className="text-xs text-red-600 mt-1.5">Pick at least one category.</p>}
    </div>
  );
}
