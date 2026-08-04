'use client';

import { useEffect, useRef, useState } from 'react';
import { IconChevronDown } from './ui';
import { LOCATION_GROUPS } from '@/lib/types';

export type DropdownOption = { value: string; label: string };
export type DropdownGroup = { label: string; options: DropdownOption[] };

/**
 * A fully custom-rendered dropdown — not a native <select>.
 *
 * Native selects can only be restyled up to the closed box (appearance-none +
 * a custom chevron); the OPEN option list is drawn by the OS/browser and is
 * not stylable with CSS in any browser. This renders both the trigger and the
 * option panel ourselves, so hover/selected states, colors, and rounding all
 * match the rest of the design system.
 *
 * Still participates in normal <form> submission (GET query strings, POST
 * FormData) via a hidden input carrying the current value under `name` —
 * every existing filter form keeps working unchanged.
 */
export function Dropdown({
  name, value, defaultValue, onChange, options, groups, leadingOptions, placeholder, ariaLabel, className = '',
}: {
  name?: string; value?: string; defaultValue?: string; onChange?: (value: string) => void;
  options?: DropdownOption[]; groups?: DropdownGroup[]; leadingOptions?: DropdownOption[]; placeholder?: string; ariaLabel: string; className?: string;
}) {
  const flat = [...(leadingOptions ?? []), ...(options ?? (groups ?? []).flatMap(g => g.options))];
  const [internal, setInternal] = useState(value ?? defaultValue ?? flat[0]?.value ?? '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Controlled usage (e.g. geolocation snapping the value programmatically).
  useEffect(() => { if (value !== undefined) setInternal(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDocMouseDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const select = (v: string) => {
    setInternal(v);
    onChange?.(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const selectedLabel = flat.find(o => o.value === internal)?.label ?? placeholder ?? flat[0]?.label ?? '';

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) { setOpen(true); setHighlight(Math.max(0, flat.findIndex(o => o.value === internal))); }
      else if (e.key !== 'ArrowDown') select(flat[highlight]?.value ?? internal);
      else setHighlight(h => Math.min(flat.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight(h => Math.max(0, h - 1));
    }
  };

  // Running index into `flat` as we render leadingOptions/groups, so keyboard
  // highlight (an index into the same flat order) lines up with what's drawn.
  let flatIndex = -1;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={internal} />}
      <button
        ref={triggerRef} type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}
        onClick={() => { setOpen(o => !o); setHighlight(Math.max(0, flat.findIndex(o => o.value === internal))); }}
        onKeyDown={onTriggerKeyDown}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-left hover:border-accent/50 focus:border-accent focus:outline-none"
      >
        <span className="truncate">{selectedLabel}</span>
        <span className="text-muted shrink-0"><IconChevronDown /></span>
      </button>

      {open && (
        <div role="listbox" aria-label={ariaLabel}
          className="absolute z-50 mt-1.5 w-full min-w-max max-h-72 overflow-y-auto rounded-2xl border border-line bg-card shadow-[0_8px_30px_rgba(45,42,38,0.15)] py-1.5">
          {leadingOptions?.map(o => {
            flatIndex++;
            return <Option key={o.value} option={o} selected={o.value === internal} highlighted={flatIndex === highlight} onSelect={select} />;
          })}
          {groups
            ? groups.map(g => (
                <div key={g.label}>
                  <p className="px-3.5 pt-2 pb-1 text-[11px] uppercase tracking-wider text-muted font-semibold">{g.label}</p>
                  {g.options.map(o => {
                    flatIndex++;
                    return <Option key={o.value} option={o} selected={o.value === internal} highlighted={flatIndex === highlight} onSelect={select} />;
                  })}
                </div>
              ))
            : options?.map(o => {
                flatIndex++;
                return <Option key={o.value} option={o} selected={o.value === internal} highlighted={flatIndex === highlight} onSelect={select} />;
              })}
        </div>
      )}
    </div>
  );
}

function Option({ option, selected, highlighted, onSelect }: {
  option: DropdownOption; selected: boolean; highlighted: boolean; onSelect: (v: string) => void;
}) {
  return (
    <button
      type="button" role="option" aria-selected={selected}
      onClick={() => onSelect(option.value)}
      onMouseEnter={e => e.currentTarget.focus({ preventScroll: true })}
      className={`mx-1.5 flex w-[calc(100%-0.75rem)] items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-left transition-colors ${
        selected ? 'bg-accent-soft text-accent font-medium' : highlighted ? 'bg-sea-soft text-foreground' : 'text-foreground hover:bg-sea-soft'
      }`}
    >
      <span className="truncate">{option.label}</span>
      {selected && <span aria-hidden className="shrink-0 text-accent">✓</span>}
    </button>
  );
}

/** Drop-in replacement for the old native-select LocationSelect — same API,
 *  now backed by Dropdown so the open panel is fully custom-styled too. */
export function LocationSelect({ name = 'neighborhood', defaultValue, allowAny = false, anyLabel = 'All locations', className = '', ariaLabel = 'Location' }: {
  name?: string; defaultValue?: string | null; allowAny?: boolean; anyLabel?: string; className?: string; ariaLabel?: string;
}) {
  const groups = Object.entries(LOCATION_GROUPS).map(([label, areas]) => ({ label, options: areas.map(a => ({ value: a, label: a })) }));
  return (
    <Dropdown
      name={name}
      defaultValue={defaultValue ?? (allowAny ? '' : 'Newport Beach')}
      leadingOptions={allowAny ? [{ value: '', label: anyLabel }] : undefined}
      groups={groups}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}
