-- Full account deletion + permanent email ban, and a realtime channel so any
-- admin action (suspend/reinstate/ban/unban) reaches the affected user's
-- browser immediately with the reason, instead of waiting for them to check
-- their notifications.
--
-- No SUPABASE_SERVICE_ROLE_KEY exists anywhere in this app (nothing in lib/
-- references it), so this does NOT go through the Supabase Auth Admin API.
-- Instead admin_delete_and_ban_user() deletes auth.users directly from a
-- security-definer function — the same privilege level the existing
-- on_auth_user_created trigger (0001_init.sql) already relies on to act on
-- the auth schema. Deleting auth.users cascades to public.users ("on delete
-- cascade", 0001_init.sql), which in turn cascades through nearly every table
-- in the schema (creative/business_profiles, jobs, matches, messages,
-- reviews, agreements, portfolio_items, favorites, notifications, reports,
-- blocked users, subscriptions) — "fully delete" really does mean everything
-- tied to that user disappears, including reviews the OTHER party received
-- from them. That's the existing schema's cascade design, not something new
-- introduced here.

-- ===== Permanent ban list =====
-- Deliberately NOT a foreign key to users(id): it has to keep working after
-- the banned person's row (and their auth.users row) are both gone, so a
-- deleted account can't just sign up again with the same email.
create table banned_emails (
  email        text primary key,
  reason       text not null,
  banned_by    uuid references users(id) on delete set null,
  banned_at    timestamptz not null default now(),
  unbanned_by  uuid references users(id) on delete set null,
  unbanned_at  timestamptz
);
alter table banned_emails enable row level security;
create policy banned_emails_read_staff on banned_emails for select to authenticated using (is_staff());

-- Block signup at the source: handle_new_user() runs on every insert into
-- auth.users, for both Google OAuth and email/password (0001_init.sql) — so
-- this is the one choke point that covers both paths.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from banned_emails where email = new.email and unbanned_at is null) then
    raise exception 'ACCOUNT_BANNED' using errcode = '42501';
  end if;
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ===== Realtime moderation-action feed =====
-- No FK to users(id) on purpose — a "banned" row must survive the delete
-- that happens in the very same admin action. RLS restricts it to the
-- affected user (and staff, for a future audit view), and it's added to the
-- realtime publication below so a client-side listener sees it the instant
-- it's inserted, exactly like the existing messages/notifications channels.
create table account_actions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  action     text not null check (action in ('suspended', 'reinstated', 'banned', 'unbanned')),
  reason     text,
  actor_id   uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index account_actions_user_idx on account_actions (user_id, created_at desc);
alter table account_actions enable row level security;
create policy account_actions_read_own on account_actions for select to authenticated using (user_id = auth.uid());
create policy account_actions_read_staff on account_actions for select to authenticated using (is_staff());

alter publication supabase_realtime add table account_actions;

-- Suspend/reinstate already existed (0009_admin.sql) but never told the
-- affected user's browser directly — only the audit log. Now it also drops
-- an account_actions row so the same realtime popup covers it.
create or replace function admin_set_account_status(p_user uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'ADMIN_ONLY' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'CANNOT_SUSPEND_SELF' using errcode = '22023'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'INVALID_STATUS' using errcode = '22023'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;

  update users set status = p_status where id = p_user;
  if not found then raise exception 'USER_UNKNOWN' using errcode = '22023'; end if;

  if p_status = 'suspended' then
    update jobs set status = 'closed' where business_id = p_user and status in ('open', 'in_progress');
  end if;

  insert into account_actions (user_id, action, reason, actor_id)
  values (p_user, case when p_status = 'suspended' then 'suspended' else 'reinstated' end, p_reason, auth.uid());

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'ACCOUNT_STATUS_SET', 'user', p_user, jsonb_build_object('status', p_status, 'reason', p_reason));
end;
$$;

-- Admin-only, like suspend. Reason required, logged, and — unlike suspend —
-- genuinely irreversible for the account's data (see header comment on
-- cascade scope). "Unban" (below) only ever lifts the future signup block;
-- it can never bring the deleted rows back.
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

  -- Insert the realtime notice before the delete, while the account still
  -- has an active connection to receive it.
  insert into account_actions (user_id, action, reason, actor_id)
  values (p_user, 'banned', p_reason, auth.uid());

  insert into banned_emails (email, reason, banned_by, banned_at, unbanned_by, unbanned_at)
  values (v_email, p_reason, auth.uid(), now(), null, null)
  on conflict (email) do update
    set reason = excluded.reason, banned_by = excluded.banned_by, banned_at = now(),
        unbanned_by = null, unbanned_at = null;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'ACCOUNT_DELETED_AND_BANNED', 'user', p_user, jsonb_build_object('reason', p_reason, 'email', v_email));

  -- Cascades through public.users to virtually every table referencing
  -- them — see header comment.
  delete from auth.users where id = p_user;
end;
$$;

create or replace function admin_unban_email(p_email text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'ADMIN_ONLY' using errcode = '42501'; end if;

  update banned_emails set unbanned_at = now(), unbanned_by = auth.uid()
  where email = p_email and unbanned_at is null;
  if not found then raise exception 'EMAIL_NOT_BANNED' using errcode = '22023'; end if;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'EMAIL_UNBANNED', 'banned_email', null, jsonb_build_object('email', p_email, 'reason', p_reason));
end;
$$;

create or replace function admin_banned_emails(p_limit int default 100, p_offset int default 0)
returns table (
  email text, reason text, banned_at timestamptz, banned_by_name text,
  unbanned_at timestamptz, unbanned_by_name text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;

  return query
  select be.email, be.reason, be.banned_at, ub.display_name,
         be.unbanned_at, uu.display_name
  from banned_emails be
  left join users ub on ub.id = be.banned_by
  left join users uu on uu.id = be.unbanned_by
  order by be.unbanned_at is null desc, be.banned_at desc
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end;
$$;

revoke all on function
  admin_delete_and_ban_user(uuid, text), admin_unban_email(text, text), admin_banned_emails(int, int)
from public, anon;

grant execute on function
  admin_delete_and_ban_user(uuid, text), admin_unban_email(text, text), admin_banned_emails(int, int)
to authenticated;
