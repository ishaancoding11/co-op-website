import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';
import { markAllNotificationsRead } from '@/lib/actions';
import { Card, EmptyState } from '@/components/ui';
import type { Notification } from '@/lib/types';

const ICONS: Record<string, string> = {
  new_match: '🎉', new_message: '💬', job_application: '📩', application_accepted: '✅',
  review_request: '⭐️', review_received: '⭐️', agreement_update: '📋',
};

export default async function Notifications() {
  const { userId, supabase } = await getViewer();
  if (!userId) redirect('/login');

  const { data: notifications } = await supabase.from('notifications')
    .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);

  return (
    <div className="py-8 max-w-xl mx-auto">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-display text-3xl">Notifications</h1>
        {(notifications ?? []).some(n => !n.is_read) && (
          <form action={markAllNotificationsRead}>
            <button className="text-sm text-muted underline underline-offset-2 hover:text-foreground">Mark all read</button>
          </form>
        )}
      </div>
      {!notifications?.length ? (
        <EmptyState title="All quiet" body="Matches, messages, applications, and reviews will show up here (and in your email)." />
      ) : (
        <div className="space-y-2 mt-6">
          {(notifications as Notification[]).map(n => (
            <Link key={n.id} href={n.content.href ?? '#'} className="block">
              <Card className={`p-4 flex items-start gap-3 hover:shadow-[0_8px_30px_rgba(45,42,38,0.1)] transition-shadow ${!n.is_read ? 'border-accent' : ''}`}>
                <span className="text-xl" aria-hidden>{ICONS[n.type] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>{n.content.title ?? n.type}</p>
                  {n.content.body && <p className="text-xs text-muted mt-0.5">{n.content.body}</p>}
                  <p className="text-[11px] text-muted mt-1">{new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
                {!n.is_read && <span className="h-2 w-2 rounded-full bg-accent mt-1.5" aria-label="Unread" />}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
