import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { saveBusinessProfile } from '@/lib/actions';
import { Card, Field, inputCls, LocationSelect } from '@/components/ui';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/lib/types';
import { CategoryPicker } from '../creative/category-picker';
import { RangeSlider } from '@/components/range-slider';

export default async function BusinessOnboarding() {
  const { userId, business } = await getViewer();
  if (!userId) redirect('/login?role=business');

  return (
    <div className="py-10 max-w-xl mx-auto">
      <h1 className="font-display text-3xl">Set up your business</h1>
      <p className="text-muted text-sm mt-1">Then verify your business email to start posting jobs.</p>
      <Card className="p-6 mt-6">
        <form action={saveBusinessProfile} className="space-y-5">
          <Field label="Business name"><input required name="business_name" className={inputCls} defaultValue={business?.business_name ?? ''} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type"><input name="category" className={inputCls} defaultValue={business?.category ?? ''} placeholder="Coffee shop, salon…" /></Field>
            <Field label="Location">
              <LocationSelect defaultValue={business?.neighborhood} />
            </Field>
          </div>
          <Field label="What do you usually need?">
            <CategoryPicker all={ALL_CATEGORIES} labels={CATEGORY_LABELS} initial={business?.needs ?? []} name="needs" />
          </Field>
          <Field label="Typical budget per project" hint="Drag both handles to set your usual range.">
            <RangeSlider nameMin="budget_min" nameMax="budget_max" label="budget" initialMin={business?.budget_min} initialMax={business?.budget_max} />
          </Field>
          <Field label="Brand vibe tags" hint="Comma-separated, e.g. coastal, minimal, warm">
            <input name="brand_vibe_tags" className={inputCls} defaultValue={business?.brand_vibe_tags?.join(', ') ?? ''} />
          </Field>
          <button className="w-full rounded-full bg-accent text-white py-3 text-sm font-medium hover:opacity-85">Save & continue to verification</button>
        </form>
      </Card>
    </div>
  );
}
