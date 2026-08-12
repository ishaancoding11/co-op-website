-- New business model: "Subscribe now, don't pay until your first match."
--
-- Replaces the old one-lifetime-free-slot trial system (0008_subscriptions.sql,
-- 0018_apply_time_quota.sql) entirely. New shape:
--
--   1. Every new creative/business subscribes to a plan + enters a card during
--      onboarding (see app/onboarding/{creative,business}/plan/page.tsx).
--   2. That subscription is created in Stripe with a long placeholder trial
--      (365 days) — nothing is ever charged while trialing. Recorded here as
--      subscription_status 'pending' (added in 0019, its own migration since
--      ALTER TYPE ... ADD VALUE can't be used same-transaction).
--   3. Until a user's OWN first match (is_matched on any of their matches
--      rows, for the first time), they have NO caps at all — not "their
--      plan's limits", genuinely unlimited. This replaces every trial-window/
--      one-time-allowance check that used to live here.
--   4. The moment that happens, Stripe's trial is ended early
--      (subscriptions.update(id, { trial_end: 'now' }) — see
--      lib/billing-activation.ts) and the existing webhook/apply_subscription
--      plumbing takes it from there completely unchanged: normal plan limits
--      apply from that point on, exactly as already built.
--
-- First-match detection has to work no matter which code path flips
-- is_matched (swipe-match, application-accept, direct-match all funnel
-- through the same match_guard/match_side_effects triggers already in
-- 0001_init.sql) — so it's captured here, transactionally, as an outbox
-- table (billing_activation_queue) rather than chasing every call site in
-- application code. The outbox is drained opportunistically from
-- getViewer() (see lib/billing-activation.ts) — no cron/worker needed.
--
-- Existing accounts (pre-dating this migration) have no Stripe subscription
-- at all. Per the confirmed plan: they are NOT retroactively gated — they
-- keep unlimited access until/unless they match, at which point
-- needs_plan_setup() below blocks their next quota-gated action (apply,
-- accept, post) with a distinct error, routing them to add a plan on
-- /billing (billing-actions.ts bills them immediately, no trial — see
-- comment there).

-- ===== Subscriptions: pending state =====
alter table subscriptions add column if not exists pending_since timestamptz;

-- Replaces the old "one active row" partial index — a user now always has at
-- most one LIVE (pending or active) row; historical cancelled/expired rows
-- are untouched.
drop index if exists subscriptions_one_active_idx;
create unique index subscriptions_one_live_idx on subscriptions (user_id) where status in ('active', 'pending');

-- ===== First-match outbox =====
-- No client select/insert/update policy at all: written only by
-- match_side_effects (below) and drained only by claim_first_match_billing()
-- (below) — both security definer, both the only intended writers.
create table billing_activation_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index billing_activation_queue_pending_idx on billing_activation_queue (user_id) where processed_at is null;
alter table billing_activation_queue enable row level security;

-- ===== First-match detection, folded into the existing match trigger =====
-- Independent per side, per the confirmed design: a business's 40th match
-- can be a creative's 1st on the very same row, and each is evaluated on its
-- own — "does THIS user have any OTHER matched row already" (excluding the
-- row currently transitioning, which is already is_matched=true here since
-- this is an AFTER trigger).
create or replace function public.match_side_effects() returns trigger
language plpgsql security definer set search_path = public as $$
declare biz_name text; creative_name text; biz_first boolean; creative_first boolean;
begin
  if new.is_matched and (tg_op = 'INSERT' or not old.is_matched) then
    select business_name into biz_name from business_profiles where user_id = new.business_id;
    select display_name into creative_name from users where id = new.creative_id;
    perform public.notify(new.business_id, 'new_match', jsonb_build_object('title','It''s a match!','body','You and '||coalesce(creative_name,'a creative')||' can now message each other.','href','/messages/'||new.id));
    perform public.notify(new.creative_id, 'new_match', jsonb_build_object('title','It''s a match!','body','You and '||coalesce(biz_name,'a business')||' can now message each other.','href','/messages/'||new.id));

    select not exists(
      select 1 from matches m where m.business_id = new.business_id and m.is_matched and m.id <> new.id
    ) into biz_first;
    select not exists(
      select 1 from matches m where m.creative_id = new.creative_id and m.is_matched and m.id <> new.id
    ) into creative_first;
    if biz_first then
      insert into billing_activation_queue (user_id, match_id) values (new.business_id, new.id);
    end if;
    if creative_first then
      insert into billing_activation_queue (user_id, match_id) values (new.creative_id, new.id);
    end if;
  end if;
  if tg_op = 'INSERT' and new.source = 'job_apply' then
    select display_name into creative_name from users where id = new.creative_id;
    perform public.notify(new.business_id, 'job_application', jsonb_build_object('title','New application','body',coalesce(creative_name,'A creative')||' applied to your job.','href','/jobs/'||new.job_id||'/applicants'));
  end if;
  if tg_op = 'UPDATE' and new.application_status = 'accepted' and old.application_status is distinct from 'accepted' then
    perform public.notify(new.creative_id, 'application_accepted', jsonb_build_object('title','Application accepted','body','Your application was accepted.','href','/messages/'||new.id));
  end if;
  return new;
end;
$$;
-- (trigger itself already exists from 0001_init.sql — create or replace above is enough)

-- ===== Draining the outbox =====
-- Called from the signed-in user's own session (getViewer(), on any page
-- load) — no service role needed, no new cron/worker infra. Deliberately
-- NOT a single atomic "claim" — split into a non-destructive read and a
-- separate confirm, so a Stripe API failure between the two just leaves the
-- row unprocessed for the next page load to retry. The tiny risk this opens
-- (two near-simultaneous page loads both reading the row before either
-- confirms) is harmless: calling Stripe's trial_end='now' twice on the same
-- subscription is a no-op the second time, not a double charge.
-- LEFT JOIN, not INNER: an unprocessed queue row whose subscription is no
-- longer 'pending' (already converted, or gone) must still be reported back
-- — as a row with a null stripe_subscription_id — so the caller marks it
-- processed instead of re-querying it forever. Only a 'pending' status means
-- "actually go call Stripe".
create or replace function pending_first_match_billing()
returns table (has_unprocessed boolean, stripe_subscription_id text)
language sql stable security definer set search_path = public as $$
  select true, s.stripe_subscription_id from billing_activation_queue q
  left join subscriptions s on s.user_id = q.user_id and s.status = 'pending'
  where q.user_id = auth.uid() and q.processed_at is null
  order by s.created_at desc nulls last limit 1;
$$;

-- Marks the outbox row handled regardless of whether a stripe_subscription_id
-- was found — the "no subscription on file" case (pre-migration accounts)
-- is handled by needs_plan_setup() blocking their next quota-gated action,
-- not by retrying this drain forever.
create or replace function mark_first_match_billing_processed() returns void
language sql security definer set search_path = public as $$
  update billing_activation_queue set processed_at = now()
  where user_id = auth.uid() and processed_at is null;
$$;

revoke all on function pending_first_match_billing(), mark_first_match_billing_processed() from public, anon;
grant execute on function pending_first_match_billing(), mark_first_match_billing_processed() to authenticated;

-- ===== Plan-setup gap for pre-migration accounts =====
-- True only for an account with zero subscription rows AT ALL that has
-- already matched at least once — i.e. someone who used the product before
-- this migration, under the old free-trial model, and is now past the point
-- where the new model requires a plan on file. New accounts always have a
-- subscription row from onboarding (pending at minimum), so this never
-- trips for them.
create or replace function needs_plan_setup(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    not exists(select 1 from subscriptions where user_id = p_user)
    and exists(select 1 from matches where (business_id = p_user or creative_id = p_user) and is_matched);
$$;

revoke all on function needs_plan_setup(uuid) from public, anon;
grant execute on function needs_plan_setup(uuid) to authenticated;

-- ===== Enforcement: unlimited while pending, existing plan caps once active =====
-- Replaces the trial-window/one-time-allowance branches entirely — no more
-- trial_ends_at, no more creative_ever_engaged. A 'pending' subscription
-- means genuinely no caps; anything else (cancelled/past_due/expired/no row)
-- fails closed, matching the old "trial ended" behavior.
--
-- creative_applications_used should already exist from 0018_apply_time_quota.sql
-- — defined again here (CREATE OR REPLACE, identical body) so this migration
-- doesn't silently depend on 0018 having actually been run.
create or replace function creative_applications_used(p_creative uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from matches
  where creative_id = p_creative and source = 'job_apply' and creative_action = 'liked'
    and created_at >= current_quota_month()
    and created_at < current_quota_month() + interval '1 month';
$$;

create or replace function creative_can_apply(p_creative uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare sub_status subscription_status; plan subscription_plan; cap integer;
begin
  select s.status, s.plan into sub_status, plan from subscriptions s
    where s.user_id = p_creative order by s.created_at desc limit 1;
  -- No subscription row at all = a pre-migration account that hasn't matched
  -- yet (needs_plan_setup() — checked separately by the caller — is what
  -- blocks one that HAS matched, before this function is even reached).
  -- Unlimited, same as 'pending'.
  if sub_status is null or sub_status = 'pending' then return true; end if;
  if sub_status = 'active' then
    select monthly_engagements into cap from plan_limits where plan_limits.plan = plan;
    if cap is null then return true; end if;
    return creative_applications_used(p_creative) < cap;
  end if;
  return false;
end;
$$;

create or replace function creative_can_accept(p_creative uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare sub_status subscription_status; plan subscription_plan; cap integer;
begin
  select s.status, s.plan into sub_status, plan from subscriptions s
    where s.user_id = p_creative order by s.created_at desc limit 1;
  if sub_status is null or sub_status = 'pending' then return true; end if;
  if sub_status = 'active' then
    select monthly_engagements into cap from plan_limits where plan_limits.plan = plan;
    if cap is null then return true; end if;
    return creative_engagements_used(p_creative) < cap;
  end if;
  return false;
end;
$$;

create or replace function business_can_post(p_business uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare sub_status subscription_status; plan subscription_plan; cap integer; live_now integer;
begin
  select s.status, s.plan into sub_status, plan from subscriptions s
    where s.user_id = p_business order by s.created_at desc limit 1;
  if sub_status is null or sub_status = 'pending' then return true; end if;
  if sub_status = 'active' then
    select active_job_cap into cap from plan_limits where plan_limits.plan = plan;
    if cap is null then return true; end if;
    select count(*) into live_now from jobs where business_id = p_business and status in ('open', 'in_progress');
    return live_now < cap;
  end if;
  return false;
end;
$$;

drop function if exists creative_ever_engaged(uuid);

-- ===== Guards: check needs_plan_setup before the quota check =====
create or replace function matches_application_quota_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.source = 'job_apply' and new.creative_action = 'liked'
     and (tg_op = 'INSERT' or old.creative_action is distinct from 'liked') then
    if not is_account_active(new.creative_id) then
      raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
    end if;
    if needs_plan_setup(new.creative_id) then
      raise exception 'NEEDS_PLAN_SETUP' using errcode = '53401';
    end if;
    if not creative_can_apply(new.creative_id) then
      raise exception 'CREATIVE_APPLICATION_QUOTA_EXCEEDED' using errcode = '53400';
    end if;
  end if;
  return new;
end;
$$;

-- The trigger binding itself should already exist from 0018 too — CREATE
-- TRIGGER has no IF NOT EXISTS, so drop-then-create makes this safe to run
-- whether or not 0018 actually ran on this database.
drop trigger if exists matches_application_quota_guard_trg on matches;
create trigger matches_application_quota_guard_trg before insert or update on matches
  for each row execute function matches_application_quota_guard();

create or replace function agreements_quota_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare origin_source match_source;
begin
  if not is_account_active(new.business_id) or not is_account_active(new.creative_id) then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;
  if needs_plan_setup(new.business_id) or needs_plan_setup(new.creative_id) then
    raise exception 'NEEDS_PLAN_SETUP' using errcode = '53401';
  end if;

  select source into origin_source from matches where id = new.match_id;
  if origin_source is distinct from 'job_apply' and not creative_can_accept(new.creative_id) then
    raise exception 'CREATIVE_QUOTA_EXCEEDED' using errcode = '53400';
  end if;

  new.quota_month := current_quota_month();
  return new;
end;
$$;

create or replace function jobs_quota_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if needs_plan_setup(new.business_id) then
    raise exception 'NEEDS_PLAN_SETUP' using errcode = '53401';
  end if;
  if not business_can_post(new.business_id) then
    raise exception 'BUSINESS_QUOTA_EXCEEDED' using errcode = '53400';
  end if;
  return new;
end;
$$;

-- ===== UI read helpers =====
-- Postgres won't let CREATE OR REPLACE change a function's OUT-parameter
-- shape (the old versions returned trialing/trial_ends_at instead of
-- pending/pending_since/current_period_start/needs_plan_setup) — has to be
-- dropped first.
drop function if exists my_creative_quota();
drop function if exists my_business_quota();

-- trialing/trial_ends_at replaced by pending/pending_since; needs_plan_setup
-- surfaced so lib/actions.ts can give the pre-migration-gap error before
-- even attempting the write, same as it already does for quota.
-- pending_since is "when they signed up to pay eventually" (unbilled);
-- current_period_start is "when billing actually started" once active — the
-- two are deliberately both surfaced since the UI shows a different one
-- depending on pending vs. active state.
create or replace function my_creative_quota()
returns table (
  pending boolean, pending_since timestamptz, current_period_start timestamptz, needs_plan_setup boolean,
  plan subscription_plan, monthly_limit integer, used integer, unlimited boolean, can_apply boolean
)
language sql stable security definer set search_path = public as $$
  select
    s.status = 'pending',
    s.pending_since,
    s.current_period_start,
    needs_plan_setup(auth.uid()),
    s.plan,
    pl.monthly_engagements,
    creative_applications_used(auth.uid()),
    (s.status = 'active' and pl.monthly_engagements is null),
    creative_can_apply(auth.uid())
  from (select auth.uid() as uid) me
  left join subscriptions s on s.user_id = me.uid
  left join plan_limits pl on pl.plan = s.plan
  order by s.created_at desc nulls last
  limit 1;
$$;

create or replace function my_business_quota()
returns table (
  pending boolean, pending_since timestamptz, current_period_start timestamptz, needs_plan_setup boolean,
  plan subscription_plan, job_cap integer, active_jobs integer, unlimited boolean, can_post boolean
)
language sql stable security definer set search_path = public as $$
  select
    s.status = 'pending',
    s.pending_since,
    s.current_period_start,
    needs_plan_setup(auth.uid()),
    s.plan,
    pl.active_job_cap,
    (select count(*)::integer from jobs where business_id = auth.uid() and status in ('open', 'in_progress')),
    (s.status = 'active' and pl.active_job_cap is null),
    business_can_post(auth.uid())
  from (select auth.uid() as uid) me
  left join subscriptions s on s.user_id = me.uid
  left join plan_limits pl on pl.plan = s.plan
  order by s.created_at desc nulls last
  limit 1;
$$;

-- ===== apply_subscription: also retire prior pending rows on a new insert =====
-- Unchanged in shape — only the cancellation sweep now also covers 'pending'
-- rows, so switching plans while still pending (or a stale pending row from
-- an abandoned checkout) doesn't collide with subscriptions_one_live_idx.
create or replace function apply_subscription(
  p_user                  uuid,
  p_plan                  subscription_plan,
  p_status                subscription_status,
  p_period_start          timestamptz,
  p_period_end            timestamptz,
  p_customer_ref          text default null,
  p_subscription_ref      text default null,
  p_cancel_at_period_end  boolean default false
)
returns subscriptions language plpgsql security definer set search_path = public as $$
declare
  row_out subscriptions;
  plan_role text;
  is_creative boolean;
  is_business boolean;
begin
  select role into plan_role from plan_limits where plan = p_plan;
  select exists(select 1 from creative_profiles where user_id = p_user) into is_creative;
  select exists(select 1 from business_profiles where user_id = p_user) into is_business;

  if plan_role = 'creative' and not is_creative then
    raise exception 'PLAN_ROLE_MISMATCH' using errcode = '22023';
  end if;
  if plan_role = 'business' and not is_business then
    raise exception 'PLAN_ROLE_MISMATCH' using errcode = '22023';
  end if;

  update subscriptions set status = 'cancelled'
   where user_id = p_user and status in ('active', 'pending')
     and (p_subscription_ref is null or stripe_subscription_id is distinct from p_subscription_ref);

  insert into subscriptions (
    user_id, plan, status, current_period_start, current_period_end,
    cancel_at_period_end, stripe_customer_id, stripe_subscription_id,
    pending_since
  ) values (
    p_user, p_plan, p_status, p_period_start, p_period_end,
    p_cancel_at_period_end, p_customer_ref, p_subscription_ref,
    case when p_status = 'pending' then now() else null end
  )
  on conflict (stripe_subscription_id) do update
     set plan = excluded.plan,
         status = excluded.status,
         current_period_start = excluded.current_period_start,
         current_period_end = excluded.current_period_end,
         cancel_at_period_end = excluded.cancel_at_period_end
  returning * into row_out;

  return row_out;
end;
$$;

revoke all on function creative_applications_used(uuid) from public, anon;
grant execute on function
  creative_applications_used(uuid), creative_can_apply(uuid), creative_can_accept(uuid), business_can_post(uuid),
  my_creative_quota(), my_business_quota()
to authenticated;

-- ===== Drop the retired trial columns =====
alter table creative_profiles drop column if exists trial_ends_at;
alter table business_profiles drop column if exists trial_ends_at;

-- ===== Admin billing list: report pending/active state instead of trial =====
-- Same OUT-shape restriction as above — drop before recreating with the new
-- column set (trial_ends_at replaced by pending_since, column order changed).
drop function if exists admin_subscriptions(text, int, int);
create or replace function admin_subscriptions(p_search text default null, p_limit int default 50, p_offset int default 0)
returns table (
  user_id uuid, display_name text, kind text, plan subscription_plan,
  subscription_status subscription_status, pending_since timestamptz, current_period_end timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;

  return query
  select u.id, u.display_name, 'creative', s.plan, s.status, s.pending_since, s.current_period_end
  from creative_profiles c
  join users u on u.id = c.user_id
  left join lateral (
    select * from subscriptions where user_id = u.id order by created_at desc limit 1
  ) s on true
  where p_search is null or u.display_name ilike '%' || p_search || '%'
  union all
  select u.id, u.display_name, 'business', s.plan, s.status, s.pending_since, s.current_period_end
  from business_profiles b
  join users u on u.id = b.user_id
  left join lateral (
    select * from subscriptions where user_id = u.id order by created_at desc limit 1
  ) s on true
  where p_search is null or u.display_name ilike '%' || p_search || '%'
  order by coalesce(pending_since, current_period_end) desc nulls last
  limit greatest(1, least(p_limit, 200)) offset greatest(0, p_offset);
end;
$$;
