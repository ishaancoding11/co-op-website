-- Ban appeals: a one-shot channel for a fully-deleted (banned) account to
-- reach staff, plus the plumbing a signup attempt needs to show a clear
-- message instead of a raw/generic error.
--
-- Deliberately NOT built on support_tickets: that table requires auth.uid()
-- and a not-null FK to users(id) — a banned account has neither, since
-- admin_delete_and_ban_user() deletes the row outright (0014_moderation.sql).
-- Relaxing support_tickets' identity model to accommodate an anonymous,
-- email-keyed submission would touch a table that's already deployed and
-- working, for a case that doesn't fit its shape. A small dedicated table
-- keeps this isolated and lets appeal review live right next to the Unban
-- button in the admin Banned tab, rather than in a generic support queue.

-- ===== Appeal submissions =====
create table ban_appeals (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  message     text not null,
  status      text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  handled_by  uuid references users(id),
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index ban_appeals_status_idx on ban_appeals (status, created_at desc);
create index ban_appeals_email_idx on ban_appeals (email, created_at desc);

alter table ban_appeals enable row level security;
-- Staff-only read. No insert policy at all — every row is written by
-- submit_ban_appeal() (security definer), never inserted directly, same
-- pattern as audit_log and reports.
create policy ban_appeals_read_staff on ban_appeals for select to authenticated using (is_staff());

-- ===== One appeal per ban =====
-- Lives directly on the row that already represents the current ban, so
-- "has this ban received an appeal" is a single column read, and a re-ban
-- resets it for free by resetting the same row (see the ON CONFLICT clause
-- in admin_delete_and_ban_user() below).
alter table banned_emails add column if not exists appeal_submitted_at timestamptz;

-- ===== Pre-signup check =====
-- Boolean only — never leaks the reason, who banned them, or when. Used to
-- show a clear message before a signup attempt is even made, instead of
-- letting it fail and showing GoTrue's generic "Database error saving new
-- user" (which the handle_new_user() trigger's ACCOUNT_BANNED exception
-- gets wrapped into, indistinguishable from any other DB error by message
-- text alone).
create or replace function public.is_email_banned(p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from banned_emails
    where lower(email) = lower(trim(coalesce(p_email, ''))) and unbanned_at is null
  );
$$;
grant execute on function public.is_email_banned(text) to anon, authenticated;

-- ===== Submit an appeal =====
-- No auth required — a banned account has none. Rejects anything that isn't
-- a currently-banned email, and anything that already has an appeal on this
-- ban cycle.
create or replace function public.submit_ban_appeal(p_email text, p_message text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_message text := trim(coalesce(p_message, ''));
  appeal_id uuid;
begin
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'INVALID_EMAIL' using errcode = '22023';
  end if;
  if v_message = '' then raise exception 'MESSAGE_REQUIRED' using errcode = '22023'; end if;

  if not exists (select 1 from banned_emails where lower(email) = v_email and unbanned_at is null) then
    raise exception 'NOT_BANNED' using errcode = '22023';
  end if;
  if exists (select 1 from banned_emails where lower(email) = v_email and appeal_submitted_at is not null) then
    raise exception 'ALREADY_SUBMITTED' using errcode = '22023';
  end if;

  insert into ban_appeals (email, message) values (v_email, left(v_message, 4000))
  returning id into appeal_id;

  update banned_emails set appeal_submitted_at = now() where lower(email) = v_email;

  return appeal_id;
end;
$$;
grant execute on function public.submit_ban_appeal(text, text) to anon, authenticated;

-- ===== Staff review =====
-- Return shape changes (new appeal_* columns), so the old function has to be
-- dropped first — CREATE OR REPLACE can't change a function's output columns.
drop function if exists admin_banned_emails(int, int);

create function admin_banned_emails(p_limit int default 100, p_offset int default 0)
returns table (
  email text, reason text, banned_at timestamptz, banned_by_name text,
  unbanned_at timestamptz, unbanned_by_name text,
  appeal_id uuid, appeal_message text, appeal_status text, appeal_created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;

  return query
  select be.email, be.reason, be.banned_at, ub.display_name,
         be.unbanned_at, uu.display_name,
         a.id, a.message, a.status, a.created_at
  from banned_emails be
  left join users ub on ub.id = be.banned_by
  left join users uu on uu.id = be.unbanned_by
  left join lateral (
    select ba.id, ba.message, ba.status, ba.created_at
    from ban_appeals ba
    where ba.email = be.email
    order by ba.created_at desc
    limit 1
  ) a on true
  order by be.unbanned_at is null desc, be.banned_at desc
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end;
$$;

create or replace function admin_resolve_ban_appeal(p_appeal uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;
  if p_status not in ('resolved', 'dismissed') then raise exception 'INVALID_STATUS' using errcode = '22023'; end if;

  update ban_appeals set status = p_status, handled_by = auth.uid(), handled_at = now() where id = p_appeal;
  if not found then raise exception 'APPEAL_UNKNOWN' using errcode = '22023'; end if;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'BAN_APPEAL_RESOLVED', 'ban_appeal', p_appeal, jsonb_build_object('status', p_status));
end;
$$;

-- ===== Reset the one-appeal limit on re-ban =====
-- Same function as 0014_moderation.sql, with appeal_submitted_at added to
-- the existing ON CONFLICT reset (which already resets unbanned_by/
-- unbanned_at the same way) — a fresh ban cycle gets a fresh appeal slot.
create or replace function admin_delete_and_ban_user(p_user uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  if not is_admin() then raise exception 'ADMIN_ONLY' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'CANNOT_DELETE_SELF' using errcode = '22023'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;

  select email into v_email from users where id = p_user;
  if not found then raise exception 'USER_UNKNOWN' using errcode = '22023'; end if;

  insert into account_actions (user_id, action, reason, actor_id)
  values (p_user, 'banned', p_reason, auth.uid());

  insert into banned_emails (email, reason, banned_by, banned_at, unbanned_by, unbanned_at)
  values (v_email, p_reason, auth.uid(), now(), null, null)
  on conflict (email) do update
    set reason = excluded.reason, banned_by = excluded.banned_by, banned_at = now(),
        unbanned_by = null, unbanned_at = null, appeal_submitted_at = null;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'ACCOUNT_DELETED_AND_BANNED', 'user', p_user, jsonb_build_object('reason', p_reason, 'email', v_email));

  delete from auth.users where id = p_user;
end;
$$;

revoke all on function
  admin_banned_emails(int, int), admin_resolve_ban_appeal(uuid, text)
from public, anon;
grant execute on function
  admin_banned_emails(int, int), admin_resolve_ban_appeal(uuid, text)
to authenticated;
