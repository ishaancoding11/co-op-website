import { Card } from '@/components/ui';
import { AppealForm } from './appeal-form';

export default async function AppealPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;

  return (
    <div className="py-20 max-w-sm mx-auto">
      <Card className="p-8 text-center">
        <h1 className="font-display text-3xl">Appeal a ban</h1>
        <p className="text-muted text-sm mt-2">
          If you think your account was removed in error, tell us why. You can only submit one appeal per ban.
        </p>
        <div className="mt-6">
          <AppealForm defaultEmail={email ?? ''} />
        </div>
      </Card>
    </div>
  );
}
