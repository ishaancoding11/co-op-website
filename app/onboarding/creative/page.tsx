import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { saveCreativeProfile } from '@/lib/actions';
import { Card, Field, inputCls } from '@/components/ui';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/lib/types';
import { CategoryPicker } from './category-picker';
import { RangeSlider } from '@/components/range-slider';
import { DayPicker } from '@/components/day-picker';
import { LocationField } from '@/components/location-field';

export default async function CreativeOnboarding() {
  const { userId, creative, business } = await getViewer();
  if (!userId) redirect('/login?role=creative');
  // Roles are locked at signup: an account with a business profile can't add a creative one.
  if (business && !creative) redirect('/browse');

  return (
    <div className="py-10 max-w-xl mx-auto">
      <h1 className="font-display text-3xl">Set up your creative profile</h1>
      <p className="text-muted text-sm mt-1">This is what local businesses see when they discover you.</p>
      <Card className="p-6 mt-6">
        <form action={saveCreativeProfile} className="space-y-5">
          <Field label="What do you do?" hint="Pick all that apply.">
            <CategoryPicker all={ALL_CATEGORIES} labels={CATEGORY_LABELS} initial={creative?.categories ?? []} name="categories" />
          </Field>
          <Field label="Bio">
            <textarea name="bio" rows={3} className={inputCls} defaultValue={creative?.bio ?? ''} placeholder="What you make, and what makes you worth booking." />
          </Field>
          <Field label="Where are you based?">
            <LocationField initial={creative?.neighborhood} />
          </Field>
          <Field label="Rate range" hint="Drag both handles — what a typical project runs, low to high.">
            <RangeSlider nameMin="rate_min" nameMax="rate_max" label="rate" initialMin={creative?.rate_min} initialMax={creative?.rate_max} />
          </Field>
          <Field label="Which days are you usually available?">
            <DayPicker initial={creative?.available_days ?? []} />
          </Field>
          <Field label="Availability details (optional)" hint="Anything the day picker can't say.">
            <input name="availability" className={inputCls} defaultValue={creative?.availability ?? ''} placeholder="e.g. mostly evenings, flexible for shoots" />
          </Field>

          <details className="rounded-xl border border-line p-4">
            <summary className="text-sm font-medium cursor-pointer">Musician / performer details (only if it applies)</summary>
            <div className="space-y-4 mt-4">
              <Field label="Past venues & events" hint="One per line."><textarea name="venues" rows={3} className={inputCls} placeholder={"Lido Marina Village — summer market\nCdM Farmers Market"} /></Field>
              <Field label="Audio links" hint="One URL per line."><textarea name="audio_links" rows={2} className={inputCls} /></Field>
              <Field label="Video links" hint="One URL per line."><textarea name="video_links" rows={2} className={inputCls} /></Field>
            </div>
          </details>

          <button className="w-full rounded-full bg-foreground text-background py-3 text-sm font-medium hover:opacity-85">Save profile</button>
          <p className="text-xs text-muted text-center">Next: add portfolio pieces from your Portfolio tab.</p>
        </form>
      </Card>
    </div>
  );
}
