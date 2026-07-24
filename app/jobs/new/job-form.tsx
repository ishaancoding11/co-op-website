'use client';

import { useActionState } from 'react';
import { postJob } from '@/lib/actions';
import { Field, inputCls, LocationSelect } from '@/components/ui';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/lib/types';

export function JobForm({ defaultLocation }: { defaultLocation: string | null }) {
  const [state, action, pending] = useActionState(postJob, {});
  return (
    <form action={action} className="space-y-5">
      <Field label="Title"><input required name="title" className={inputCls} placeholder="e.g. Menu + interior photo refresh" /></Field>
      <Field label="Description">
        <textarea required name="description" rows={5} className={inputCls} placeholder="What you need, deliverables, style references, timing…" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <select required name="category" className={inputCls}>
            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </Field>
        <Field label="Location">
          <LocationSelect name="location" defaultValue={defaultLocation} />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Budget from ($)"><input type="number" min={0} name="budget_min" className={inputCls} /></Field>
        <Field label="Budget to ($)"><input type="number" min={0} name="budget_max" className={inputCls} /></Field>
        <Field label="Deadline"><input type="date" name="deadline" className={inputCls} /></Field>
      </div>
      {state?.error && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2.5">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-full bg-accent text-white py-3 text-sm font-medium hover:opacity-85 disabled:opacity-40">
        {pending ? 'Posting…' : 'Post job'}
      </button>
      <p className="text-xs text-muted text-center">Payments are handled directly between you and the creative — Co-op charges no fees.</p>
    </form>
  );
}
