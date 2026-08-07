import { deleteAndBanUser, setAccountStatus, unbanEmail } from '@/lib/admin-actions';
import { Card, inputCls } from '@/components/ui';

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

/** GET form — a search is a URL a moderator can paste into a support thread. */
export function SearchBar({ action, value, placeholder = 'Search…', hidden }: {
  action: string; value?: string; placeholder?: string; hidden?: Record<string, string>;
}) {
  return (
    <form action={action} className="flex gap-2">
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input className={inputCls} type="search" name="q" defaultValue={value ?? ''} placeholder={placeholder} maxLength={100} />
      <button className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-85 shrink-0">Search</button>
    </form>
  );
}

export function Metric({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div>
      <p className={`tabular-nums text-sm ${alert ? 'font-semibold text-red-700' : ''}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export function AdminStatusBadge({ status }: { status: string }) {
  const tone = status === 'active' || status === 'verified' || status === 'open'
    ? 'bg-sea-soft text-sea'
    : status === 'pending' || status === 'suspended'
    ? 'bg-accent-soft text-accent'
    : status === 'banned'
    ? 'bg-red-50 text-red-700'
    : 'bg-line text-muted';
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tone}`}>{status.replace(/_/g, ' ')}</span>;
}

/**
 * Suspend/reinstate — collapsed behind <details>, requiring a typed reason.
 * Both on purpose: the reason lands in audit_log, and a destructive control
 * that's one stray click away from a roster row eventually gets clicked by
 * mistake. Rendered only for admins by the caller (page-level check) —
 * moderators can read these pages, but admin_set_account_status() refuses
 * them, so showing the form would offer a button that always fails.
 */
export function StatusForm({ userId, status }: { userId: string; status: string }) {
  const suspending = status !== 'suspended';
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-muted hover:text-foreground">
        {suspending ? 'Suspend this account' : 'Reinstate this account'}
      </summary>
      <form action={setAccountStatus} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="status" value={suspending ? 'suspended' : 'active'} />
        <input className={`${inputCls} max-w-sm flex-1`} name="reason" required minLength={3} maxLength={500}
          placeholder="Reason (kept in the audit log)" />
        <button className={`rounded-full px-4 py-2 text-sm font-medium shrink-0 ${suspending ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-accent-soft text-accent hover:bg-line'}`}>
          {suspending ? 'Suspend' : 'Reinstate'}
        </button>
      </form>
      {suspending && (
        <p className="mt-1.5 text-xs text-muted">Nothing is deleted. New job posts, accepted agreements, and messages are blocked; existing ones stay readable.</p>
      )}
    </details>
  );
}

/**
 * Delete & ban — separate from StatusForm on purpose. Suspend keeps data and
 * can be reversed with one click; this deletes the account's data outright
 * (everything cascading from their users row — profile, jobs, matches,
 * messages, reviews, agreements) and permanently blocks the email from
 * signing up again. "Unban" (BannedEmails below) only lifts that future
 * block — it can never bring the deleted data back, so the confirmation
 * copy says so plainly. Admin-only, same tier as suspend.
 */
export function DeleteBanForm({ userId }: { userId: string }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-red-700 hover:text-red-800">Delete &amp; ban this account</summary>
      <form action={deleteAndBanUser} className="mt-2 flex flex-wrap items-center gap-2"
        onSubmit={e => { if (!confirm('This permanently deletes all of this account’s data and blocks the email from signing up again. This cannot be undone. Continue?')) e.preventDefault(); }}>
        <input type="hidden" name="userId" value={userId} />
        <input className={`${inputCls} max-w-sm flex-1`} name="reason" required minLength={3} maxLength={500}
          placeholder="Reason (kept in the audit log)" />
        <button className="rounded-full px-4 py-2 text-sm font-medium shrink-0 bg-red-600 text-white hover:bg-red-700">
          Delete &amp; ban
        </button>
      </form>
      <p className="mt-1.5 text-xs text-muted">
        Deletes the account and all of its data (profile, jobs, matches, messages, reviews, agreements) and
        permanently blocks the email from creating a new account. You can lift the email block later from the
        Banned tab, but deleted data is gone for good.
      </p>
    </details>
  );
}

export function BannedEmails({ rows, isAdmin }: {
  rows: { email: string; reason: string; banned_at: string; banned_by_name: string | null; unbanned_at: string | null; unbanned_by_name: string | null }[];
  isAdmin: boolean;
}) {
  if (!rows.length) return <p className="text-sm text-muted mt-4">No banned emails.</p>;
  return (
    <div className="space-y-3 mt-4">
      {rows.map(r => {
        const active = !r.unbanned_at;
        return (
          <Card key={r.email} className="p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-semibold">{r.email}</span>
              <AdminStatusBadge status={active ? 'banned' : 'unbanned'} />
              <span className="text-xs text-muted">
                banned {new Date(r.banned_at).toLocaleDateString('en-US')}{r.banned_by_name ? ` by ${r.banned_by_name}` : ''}
              </span>
            </div>
            <p className="text-sm mt-1.5">{r.reason}</p>
            {!active && (
              <p className="text-xs text-muted mt-1">
                Unbanned {new Date(r.unbanned_at!).toLocaleDateString('en-US')}{r.unbanned_by_name ? ` by ${r.unbanned_by_name}` : ''}
              </p>
            )}
            {isAdmin && active && (
              <form action={unbanEmail} className="mt-2 flex flex-wrap items-center gap-2">
                <input type="hidden" name="email" value={r.email} />
                <input className={`${inputCls} max-w-sm flex-1`} name="reason" maxLength={500} placeholder="Note (optional, kept in the audit log)" />
                <button className="rounded-full px-4 py-2 text-sm font-medium shrink-0 bg-accent-soft text-accent hover:bg-line">Unban</button>
              </form>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export function Pager({ page, count, perPage, extraParams = {} }: { page: number; count: number; perPage: number; extraParams?: Record<string, string> }) {
  if (page === 1 && count < perPage) return null;
  const href = (n: number) => `?${new URLSearchParams({ ...extraParams, page: String(n) })}`;
  return (
    <div className="mt-4 flex gap-4 text-sm">
      {page > 1 && <a href={href(page - 1)} className="underline underline-offset-2">Previous</a>}
      {count === perPage && <a href={href(page + 1)} className="underline underline-offset-2">Next</a>}
    </div>
  );
}
