'use client';

import { OPEN_GATE_EVENT } from './signup-gate';

export function GetStartedButton({ className = '', children = 'Get started' }: { className?: string; children?: React.ReactNode }) {
  return (
    <button onClick={() => window.dispatchEvent(new Event(OPEN_GATE_EVENT))}
      className={className || 'rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-85'}>
      {children}
    </button>
  );
}
