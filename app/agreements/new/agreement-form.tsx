'use client';

import { useActionState } from 'react';
import { createAgreement } from '@/lib/actions';
import { Field, inputCls } from '@/components/ui';
import { Dropdown } from '@/components/dropdown';
import type { Package } from '@/lib/types';

export function AgreementForm({ matchId, jobTitle, packages }: { matchId: string; jobTitle: string | null; packages: Package[] }) {
  const [state, action, pending] = useActionState(createAgreement, {});
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="match_id" value={matchId} />
      {packages.length > 0 && (
        <Field label="Start from a package (optional)">
          <Dropdown name="package_id" defaultValue="" ariaLabel="Package" leadingOptions={[{ value: '', label: 'No package — custom scope' }]}
            options={packages.map(p => ({ value: p.id, label: `${p.tier}: ${p.title} — $${p.price}` }))} />
        </Field>
      )}
      <Field label="Scope of work">
        <textarea required name="scope" rows={4} className={inputCls}
          defaultValue={jobTitle ? `Per job post: ${jobTitle}` : ''}
          placeholder="Deliverables, dates, formats, usage rights…" />
      </Field>
      <Field label="Agreed price ($)" hint="Paid directly between you two — Co-op never takes a cut.">
        <input type="number" min={0} name="agreed_price" className={inputCls} />
      </Field>
      {state?.error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2.5">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-full bg-foreground text-background py-3 text-sm font-medium hover:opacity-85 disabled:opacity-40">
        {pending ? 'Creating…' : 'Send agreement'}
      </button>
    </form>
  );
}
