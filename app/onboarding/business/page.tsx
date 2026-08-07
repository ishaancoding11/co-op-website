import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { saveBusinessProfile } from '@/lib/actions';
import { Card, Field, inputCls } from '@/components/ui';
import { RangeSlider } from '@/components/range-slider';
import { LocationField } from '@/components/location-field';
import { PhotoUploader } from '@/components/photo-uploader';

export default async function BusinessOnboarding() {
  const { userId, business, creative } = await getViewer();
  if (!userId) redirect('/login?role=business');
  // Roles are locked at signup: an account with a creative profile can't add a business one.
  if (creative && !business) redirect('/jobs');

  return (
    <div className="py-10 max-w-xl mx-auto">
      <h1 className="font-display text-3xl">Set up your business</h1>
      <p className="text-muted text-sm mt-1">Then verify your business email to start posting jobs.</p>
      <Card className="p-6 mt-6">
        <form action={saveBusinessProfile} className="space-y-5">
          <Field label="Logo / photo">
            <PhotoUploader name="logo" label="Upload a logo" currentUrl={business?.logo_url} currentName={business?.business_name ?? 'Business'} />
          </Field>
          <Field label="Business name"><input required name="business_name" className={inputCls} defaultValue={business?.business_name ?? ''} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type"><input name="category" className={inputCls} defaultValue={business?.category ?? ''} placeholder="Coffee shop, salon…" /></Field>
            <Field label="City">
              <LocationField initial={business?.neighborhood} />
            </Field>
          </div>
          <Field label="What kind of creative work do you usually need?" hint="In your own words — photos for a menu launch, reels, a mural, live music…">
            <textarea name="needs_description" rows={3} className={inputCls}
              defaultValue={business?.needs_description ?? ''}
              placeholder="e.g. We refresh our menu photos every season and want short reels for Instagram." />
          </Field>
          <Field label="Typical budget per project" hint="Drag both handles to set your usual range.">
            <RangeSlider nameMin="budget_min" nameMax="budget_max" label="budget" initialMin={business?.budget_min} initialMax={business?.budget_max} />
          </Field>
          <Field label="Brand vibe tags" hint="Comma-separated, e.g. coastal, minimal, warm">
            <input name="brand_vibe_tags" className={inputCls} defaultValue={business?.brand_vibe_tags?.join(', ') ?? ''} />
          </Field>
          <Field label="Business registration number" hint="Optional — EIN (9 digits). Helps us verify your business.">
            <input name="registration_number" className={inputCls} defaultValue={business?.registration_number ?? ''} placeholder="e.g. 123456789" inputMode="numeric" />
          </Field>
          <button className="w-full rounded-full bg-accent text-white py-3 text-sm font-medium hover:opacity-85">Save & continue to verification</button>
        </form>
      </Card>
    </div>
  );
}
