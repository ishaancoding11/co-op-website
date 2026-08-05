import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Card } from '@/components/ui';
import { AdminStatusBadge } from '../admin/admin-ui';
import { SupportForm } from './support-form';

type TicketRow = {
  id: string; subject: string; body: string;
  status: 'open' | 'resolved' | 'dismissed'; created_at: string;
};

export default async function SupportPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase
    .from('support_tickets')
    .select('id, subject, body, status, created_at')
    .order('created_at', { ascending: false });
  const tickets = (data ?? []) as TicketRow[];

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl">Contact support</h1>
      <p className="text-sm text-muted mt-1">Something not working, or a question about your account? Send us a note and we’ll reply by email.</p>

      <Card className="p-5 mt-6">
        <SupportForm />
      </Card>

      {tickets.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-xl">Your messages</h2>
          <div className="space-y-3 mt-3">
            {tickets.map(t => (
              <Card key={t.id} className="p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-semibold">{t.subject}</p>
                  <AdminStatusBadge status={t.status} />
                  <span className="text-xs text-muted">{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <p className="text-sm text-muted mt-1.5 whitespace-pre-wrap">{t.body}</p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
