-- Admin panel — staff identity, audit log, and read models over the whole
-- marketplace for moderators/admins.
--
-- Adapted from a teammate's separate project (the notFound()-not-redirect route
-- pattern, the is_staff()/is_admin() security-definer guard re-derived from
-- auth.uid() on every call, the two-tier moderator/admin split, and "suspension
-- requires a reason and is logged, never a silent or destructive action") —
-- wired to our actual schema, which has no equivalent of his fee/escrow/
-- content-scanning tables. See NOTES.md for what was skipped and why.
--
-- staff_role has NO client-facing write path anywhere in this file or the app.
-- The only way to grant it is a direct SQL UPDATE run in the Supabase dashboard.

create type staff_role as enum ('moderator', 'admin');
alter table users add column staff_role staff_role;               -- null = not staff
alter table users add column status text not null default 'active'
  check (status in ('active', 'suspended'));

-- The users_select policy (0004) is intentionally `using (true)` — display
-- names are public — but that would also expose staff_role/status to any
-- signed-in (or anon) client via a plain select. Column-level REVOKE closes
-- that without touching the row-level policy; my_staff_role() below (a
-- security-definer function, so unaffected by this revoke) is the only
-- sanctioned way to read staff_role, and only ever your own.
revoke select (staff_role, status) on users from authenticated, anon;

-- ===== Staff identity =====
-- Defined immediately after the columns above, and before any RLS policy that
-- references them: a policy created before its function exists would fail
-- outright when this script runs top to bottom.
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select staff_role is not null from users where id = auth.uid()), false);
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select staff_role = 'admin' from users where id = auth.uid()), false);
$$;

create or replace function is_account_active(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'active' from users where id = p_user), false);
$$;

create or replace function my_staff_role() returns staff_role
language sql stable security definer set search_path = public as $$
  select staff_role from users where id = auth.uid();
$$;

grant execute on function is_staff(), is_admin(), my_staff_role() to authenticated;

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references users(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index audit_log_actor_idx on audit_log (actor_id, created_at desc);
create index audit_log_entity_idx on audit_log (entity_type, entity_id, created_at desc);

alter table audit_log enable row level security;
-- Staff-only, and even then read-only from the client — every row is written
-- by a security-definer function, never inserted directly.
create policy audit_log_read_staff on audit_log for select to authenticated using (is_staff());

-- Distinct from a business closing its own job: who removed it, and why.
alter table jobs add column removed_at timestamptz;
alter table jobs add column removed_by uuid references users(id);
alter table jobs add column removed_reason text;

alter table reports add column resolved_by uuid references users(id);
alter table reports add column resolved_at timestamptz;
-- reports previously had no read policy at all (insert-only, write-and-forget).
create policy reports_read_staff on reports for select to authenticated using (is_staff());

-- ===== Suspension enforcement =====
-- A suspended account keeps read access to everything it already has (existing
-- matches, messages, agreements) — only *new* commitments are blocked. This
-- redefines the two guards from 0008 to add the check, and adds a third for
-- messages (which had none before).

create or replace function jobs_quota_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_account_active(new.business_id) then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  if not business_can_post(new.business_id) then
    raise exception 'BUSINESS_QUOTA_EXCEEDED' using errcode = '53400';
  end if;
  return new;
end;
$$;

create or replace function agreements_quota_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_account_active(new.business_id) or not is_account_active(new.creative_id) then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  if not creative_can_accept(new.creative_id) then
    raise exception 'CREATIVE_QUOTA_EXCEEDED' using errcode = '53400';
  end if;
  new.quota_month := current_quota_month();
  return new;
end;
$$;

create or replace function messages_suspension_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_account_active(new.sender_id) then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger messages_suspension_guard_trg before insert on messages
  for each row execute function messages_suspension_guard();

-- ===== Overview =====
create or replace function admin_overview()
returns table (
  creatives_total int, businesses_total int,
  jobs_active int,
  matches_last_7d int,
  new_creatives_this_week int, new_businesses_this_week int,
  creative_basic_active int, creative_premium_active int, business_standard_active int
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;

  return query
  select
    (select count(*)::int from creative_profiles),
    (select count(*)::int from business_profiles),
    (select count(*)::int from jobs where status in ('open', 'in_progress')),
    (select count(*)::int from matches where is_matched and matched_at >= now() - interval '7 days'),
    (select count(*)::int from creative_profiles where created_at >= now() - interval '7 days'),
    (select count(*)::int from business_profiles where created_at >= now() - interval '7 days'),
    (select count(*)::int from subscriptions where plan = 'creative_basic' and status = 'active' and current_period_end > now()),
    (select count(*)::int from subscriptions where plan = 'creative_premium' and status = 'active' and current_period_end > now()),
    (select count(*)::int from subscriptions where plan = 'business_standard' and status = 'active' and current_period_end > now());
end;
$$;

-- ===== User management =====
create or replace function admin_creatives(p_search text default null, p_limit int default 50, p_offset int default 0)
returns table (
  user_id uuid, display_name text, neighborhood text, categories creative_category[],
  status text, plan subscription_plan, rating_avg numeric, rating_count int, joined_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;

  return query
  select
    c.user_id, u.display_name, c.neighborhood, c.categories,
    u.status, current_creative_plan(c.user_id),
    (select avg(r.stars) from reviews r where r.reviewee_id = c.user_id),
    (select count(*)::int from reviews r where r.reviewee_id = c.user_id),
    c.created_at
  from creative_profiles c
  join users u on u.id = c.user_id
  where p_search is null or u.display_name ilike '%' || p_search || '%'
  order by c.created_at desc
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end;
$$;

create or replace function admin_businesses(p_search text default null, p_limit int default 50, p_offset int default 0)
returns table (
  user_id uuid, business_name text, neighborhood text, is_verified boolean,
  status text, plan subscription_plan, jobs_published int, joined_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;

  return query
  select
    b.user_id, b.business_name, b.neighborhood, b.is_verified,
    u.status, current_business_plan(b.user_id),
    (select count(*)::int from jobs j where j.business_id = b.user_id),
    b.created_at
  from business_profiles b
  join users u on u.id = b.user_id
  where p_search is null or b.business_name ilike '%' || p_search || '%'
  order by b.created_at desc
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end;
$$;

-- Admin-only. Requires a reason, always logged, never deletes anything.
create or replace function admin_set_account_status(p_user uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'ADMIN_ONLY' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'CANNOT_SUSPEND_SELF' using errcode = '22023'; end if;
  if p_status not in ('active', 'suspended') then raise exception 'INVALID_STATUS' using errcode = '22023'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;

  update users set status = p_status where id = p_user;
  if not found then raise exception 'USER_UNKNOWN' using errcode = '22023'; end if;

  -- Suspending a business pulls its open jobs off the feed so it can't keep
  -- collecting applications while under review. Nothing is deleted.
  if p_status = 'suspended' then
    update jobs set status = 'closed' where business_id = p_user and status in ('open', 'in_progress');
  end if;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'ACCOUNT_STATUS_SET', 'user', p_user, jsonb_build_object('status', p_status, 'reason', p_reason));
end;
$$;

-- ===== Reports queue =====
create or replace function admin_reports(p_status report_status default null)
returns table (
  id uuid, reporter_id uuid, reporter_name text,
  reported_user_id uuid, reported_name text,
  reason text, details text, status report_status, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;

  return query
  select r.id, r.reporter_id, ur.display_name, r.reported_user_id, urd.display_name,
         r.reason, r.details, r.status, r.created_at
  from reports r
  join users ur on ur.id = r.reporter_id
  join users urd on urd.id = r.reported_user_id
  where p_status is null or r.status = p_status
  order by (r.status = 'open') desc, r.created_at desc;
end;
$$;

create or replace function admin_resolve_report(p_report uuid, p_status report_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;
  if p_status not in ('resolved', 'dismissed') then raise exception 'INVALID_STATUS' using errcode = '22023'; end if;

  update reports set status = p_status, resolved_by = auth.uid(), resolved_at = now() where id = p_report;
  if not found then raise exception 'REPORT_UNKNOWN' using errcode = '22023'; end if;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'REPORT_RESOLVED', 'report', p_report, jsonb_build_object('status', p_status));
end;
$$;

-- ===== Jobs oversight =====
create or replace function admin_jobs(p_search text default null, p_status job_status default null, p_limit int default 50, p_offset int default 0)
returns table (
  id uuid, title text, business_name text, category creative_category,
  status job_status, removed_at timestamptz, application_count int, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;

  return query
  select j.id, j.title, b.business_name, j.category, j.status, j.removed_at,
         (select count(*)::int from matches m where m.job_id = j.id and m.creative_action = 'liked'),
         j.created_at
  from jobs j
  join business_profiles b on b.user_id = j.business_id
  where (p_search is null or j.title ilike '%' || p_search || '%' or b.business_name ilike '%' || p_search || '%')
    and (p_status is null or j.status = p_status)
  order by j.created_at desc
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end;
$$;

create or replace function admin_remove_job(p_job uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'REASON_REQUIRED' using errcode = '22023'; end if;

  update jobs
     set status = 'closed', removed_at = now(), removed_by = auth.uid(), removed_reason = p_reason
   where id = p_job;
  if not found then raise exception 'JOB_UNKNOWN' using errcode = '22023'; end if;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'JOB_REMOVED', 'job', p_job, jsonb_build_object('reason', p_reason));
end;
$$;

-- ===== Subscription / billing overview =====
create or replace function admin_subscriptions(p_search text default null, p_limit int default 50, p_offset int default 0)
returns table (
  user_id uuid, display_name text, kind text, plan subscription_plan,
  trial_ends_at timestamptz, subscription_status subscription_status, current_period_end timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;

  return query
  select u.id, u.display_name, 'creative', current_creative_plan(u.id),
         c.trial_ends_at, s.status, s.current_period_end
  from creative_profiles c
  join users u on u.id = c.user_id
  left join subscriptions s on s.user_id = u.id and s.status = 'active' and s.current_period_end > now()
  where p_search is null or u.display_name ilike '%' || p_search || '%'
  union all
  select u.id, u.display_name, 'business', current_business_plan(u.id),
         b.trial_ends_at, s.status, s.current_period_end
  from business_profiles b
  join users u on u.id = b.user_id
  left join subscriptions s on s.user_id = u.id and s.status = 'active' and s.current_period_end > now()
  where p_search is null or u.display_name ilike '%' || p_search || '%'
  order by trial_ends_at desc nulls last
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end;
$$;

-- ===== Privileges =====
-- Every admin_* function is granted to `authenticated` (Supabase gives every
-- signed-in user the same database role), which is why the is_staff()/
-- is_admin() check as the FIRST statement in each function body is the real
-- boundary, not a role grant.
revoke all on function
  admin_overview(), admin_creatives(text, int, int), admin_businesses(text, int, int),
  admin_set_account_status(uuid, text, text),
  admin_reports(report_status), admin_resolve_report(uuid, report_status),
  admin_jobs(text, job_status, int, int), admin_remove_job(uuid, text),
  admin_subscriptions(text, int, int)
from public, anon;

grant execute on function
  admin_overview(), admin_creatives(text, int, int), admin_businesses(text, int, int),
  admin_set_account_status(uuid, text, text),
  admin_reports(report_status), admin_resolve_report(uuid, report_status),
  admin_jobs(text, job_status, int, int), admin_remove_job(uuid, text),
  admin_subscriptions(text, int, int)
to authenticated;
