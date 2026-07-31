import Link from 'next/link';
import { redirect } from 'next/navigation';
import { chooseRole } from '@/lib/actions';
import { getViewer } from '@/lib/auth';
import { Card, LinkButton } from '@/components/ui';

export default async function Landing() {
  // Signed-in users land on their discovery surface, not the marketing page.
  const { userId, creative, business, activeRole } = await getViewer();
  if (userId && (creative || business)) {
    redirect(activeRole === 'business' ? '/browse' : '/jobs');
  }
  return (
    <div className="py-12 md:py-20">
      <div className="text-center max-w-2xl mx-auto">
        <p className="text-xs tracking-[0.25em] uppercase text-accent font-semibold">Find your local creative match.</p>
        <h1 className="font-display text-4xl md:text-6xl mt-4 leading-[1.05]">
          Local creatives.<br />Local businesses.<br /><em className="text-sea not-italic">One swipe apart.</em>
        </h1>
        <p className="text-muted mt-5 md:text-lg">
          Co-op connects small businesses with nearby freelance creatives for photos, reels, branding, murals, and live music. Personal, quick, and easy — and Co-op never takes a cut.
        </p>
        <p className="text-sm text-muted mt-4">
          Already have an account? <Link href="/login?mode=login" className="text-foreground font-medium underline underline-offset-2">Log in</Link>
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto mt-12">
        <Card className="p-8 flex flex-col items-start gap-3">
          <span className="text-3xl" aria-hidden>🎨</span>
          <h2 className="font-display text-2xl">I&rsquo;m a creative</h2>
          <p className="text-sm text-muted flex-1">Get discovered by local businesses, show your portfolio, and land paid gigs in your own community.</p>
          <form action={chooseRole.bind(null, 'creative')}>
            <button className="rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-medium hover:opacity-85">Join as a creative</button>
          </form>
        </Card>
        <Card className="p-8 flex flex-col items-start gap-3">
          <span className="text-3xl" aria-hidden>☕️</span>
          <h2 className="font-display text-2xl">I&rsquo;m a business</h2>
          <p className="text-sm text-muted flex-1">Find a trusted nearby photographer, designer, or performer fast — swipe, match, and book directly.</p>
          <form action={chooseRole.bind(null, 'business')}>
            <button className="rounded-full bg-accent text-white px-6 py-2.5 text-sm font-medium hover:opacity-85">Join as a business</button>
          </form>
        </Card>
      </div>

      <div className="max-w-3xl mx-auto mt-10 text-center">
        <p className="text-sm text-muted mb-3">Just looking? No account needed:</p>
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <Link href="/browse" className="rounded-full border border-line bg-card py-3 text-sm font-medium hover:border-accent hover:text-accent transition-colors">
            Browse creatives
          </Link>
          <Link href="/jobs" className="rounded-full border border-line bg-card py-3 text-sm font-medium hover:border-sea hover:text-sea transition-colors">
            Browse jobs
          </Link>
        </div>
      </div>
      <div className="text-center mt-16 grid grid-cols-3 max-w-lg mx-auto text-sm">
        <div><p className="font-display text-2xl">0%</p><p className="text-muted text-xs mt-1">platform fees</p></div>
        <div><p className="font-display text-2xl">Local</p><p className="text-muted text-xs mt-1">your neighborhood only</p></div>
        <div><p className="font-display text-2xl">Direct</p><p className="text-muted text-xs mt-1">you two, no middleman</p></div>
      </div>
    </div>
  );
}
