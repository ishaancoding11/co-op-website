import { Card } from '@/components/ui';
import { GoogleButton } from './google-button';

export default async function Login({ searchParams }: { searchParams: Promise<{ role?: string; next?: string }> }) {
  const { role, next } = await searchParams;
  return (
    <div className="py-20 max-w-sm mx-auto">
      <Card className="p-8 text-center">
        <h1 className="font-display text-3xl">Welcome to Co-op</h1>
        <p className="text-muted text-sm mt-2">
          {role === 'business' ? 'Sign in to find and book local creatives.' : 'Sign in to get discovered and land local gigs.'}
        </p>
        <div className="mt-6">
          <GoogleButton role={role} next={next} />
        </div>
        <p className="text-xs text-muted mt-6">One account works for both sides — you can add a creative or business profile anytime.</p>
      </Card>
    </div>
  );
}
