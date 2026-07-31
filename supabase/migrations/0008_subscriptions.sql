-- Subscriptions & quotas.
--
-- Adapted from a teammate's separate project (Stripe Checkout/webhook plumbing,
-- the plan_limits/subscriptions table pattern, current_plan()/apply_subscription()
-- style functions) — but with his commission/escrow system, his pricing, and his
-- permanent free tier removed entirely. Co-op never takes a cut of a job; it
-- only charges for platform access. See NOTES.md for the full adaptation notes.
--
-- Model: every new account gets a 1-month trial with a ONE-TIME (not monthly)
-- allowance — 1 accepted job for creatives, 1 posted job for businesses. After
-- the trial window (or after the one-time allowance is used, whichever first),
-- new commitments require an active paid subscription. Existing matches,
-- messages, and agreements stay fully usable either way — only *new* accepts
-- and *new* job posts are gated.

create type subscription_plan as enum ('creative_basic', 'creative_premium', 'business_standard');
create type subscription_status as enum ('active', 'past_due', 'cancelled', 'expired');

-- ===== Plan catalog =====
-- NULL cap = unlimited. Kept in a table (not hardcoded) so a pricing change is
-- an UPDATE, not a migration — but still enforced in the database, per-row,
-- so the quota can't be lifted by an API bug.
create table plan_limits (
  plan                 subscription_plan primary key,
  role                 text not null check (role in ('creative', 'business')),
  monthly_engagements  integer,  -- creative: accepted agreements per calendar month; null = unlimited
  active_job_cap       integer,  -- business: simultaneously open jobs; null = unlimited
  priority_placement   boolean not null default false,
  price_monthly_cents  integer not null,
  price_annual_cents   integer   -- null = no annual option for this plan
);

insert into plan_limits (plan, role, monthly_engagements, active_job_cap, priority_placement, price_monthly_cents, price_annual_cents) values
  ('creative_basic',    'creative', 5,    null, false, 1199, 11999),
  ('creative_premium',  'creative', null, null, true,  1999, null),
  ('business_standard', 'business', null, 15,   true,  5499, 55999);

alter table plan_limits enable row level security;
grant select on plan_limits to anon, authenticated;
create policy plan_limits_read on plan_limits for select using (true);

-- ===== Subscriptions =====
create table subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references users(id) on delete cascade,
  plan                    subscription_plan not null,
  status                  subscription_status not null default 'active',
  current_period_start    timestamptz not null,
  current_period_end      timestamptz not null,
  cancel_at_period_end    boolean not null default false,
  stripe_customer_id      text,
  stripe_subscription_id  text unique,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint subscriptions_period_order check (current_period_end > current_period_start)
);

-- A user may hold only one live subscription at a time.
create unique index subscriptions_one_active_idx on subscriptions (user_id) where status = 'active';
create index subscriptions_user_idx on subscriptions (user_id, status);

alter table subscriptions enable row level security;
grant select on subscriptions to authenticated;
create policy subscriptions_read_own on subscriptions for select to authenticated using (user_id = auth.uid());
-- No client insert/update/delete policy: rows are written only by
-- apply_subscription(), which only the service role (the Stripe webhook) may call.

create or replace function touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger subscriptions_touch before update on subscriptions
  for each row execute function touch_updated_at();

-- ===== Trial window =====
-- Set once at profile creation. Existing rows (from before this migration) get
-- the value evaluated at migration time rather than their true signup date —
-- fine for the current seed/demo data; new signups get a correct per-row value.
alter table creative_profiles add column if not exists trial_ends_at timestamptz not null default (now() + interval '1 month');
alter table business_profiles add column if not exists trial_ends_at timestamptz not null default (now() + interval '1 month');

-- Pinned at acceptance so a deal that runs into next month doesn't consume a
-- second slot, and stalling a delivery can't free one up.
alter table agreements add column if not exists quota_month date;

-- ===== Plan lookups =====
create or replace function current_creative_plan(p_creative uuid)
returns subscription_plan language sql stable security definer set search_path = public as $$
  select s.plan from subscriptions s
  join plan_limits pl on pl.plan = s.plan
  where s.user_id = p_creative and s.status = 'active' and s.current_period_end > now() and pl.role = 'creative'
  limit 1;
$$;

create or replace function current_business_plan(p_business uuid)
returns subscription_plan language sql stable security definer set search_path = public as $$
  select s.plan from subscriptions s
  join plan_limits pl on pl.plan = s.plan
  where s.user_id = p_business and s.status = 'active' and s.current_period_end > now() and pl.role = 'business'
  limit 1;
$$;

create or replace function current_quota_month() returns date
language sql stable as $$
  select date_trunc('month', (now() at time zone 'utc'))::date;
$$;

create or replace function creative_engagements_used(p_creative uuid, p_month date default null)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer from agreements
  where creative_id = p_creative and quota_month = coalesce(p_month, current_quota_month());
$$;

-- ===== Enforcement (called from triggers below, and usable for UI pre-checks) =====
create or replace function creative_can_accept(p_creative uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  plan subscription_plan;
  cap integer;
  trial_end timestamptz;
  ever_had_one boolean;
begin
  plan := current_creative_plan(p_creative);
  if plan is not null then
    select monthly_engagements into cap from plan_limits where plan_limits.plan = plan;
    if cap is null then return true; end if; -- unlimited (premium)
    return creative_engagements_used(p_creative) < cap;
  end if;

  select trial_ends_at into trial_end from creative_profiles where user_id = p_creative;
  if trial_end is null or trial_end <= now() then return false; end if;

  select exists(select 1 from agreements where creative_id = p_creative) into ever_had_one;
  return not ever_had_one;
end;
$$;

create or replace function business_can_post(p_business uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  plan subscription_plan;
  cap integer;
  live_now integer;
  trial_end timestamptz;
  ever_posted boolean;
begin
  plan := current_business_plan(p_business);
  if plan is not null then
    select active_job_cap into cap from plan_limits where plan_limits.plan = plan;
    if cap is null then return true; end if;
    select count(*) into live_now from jobs where business_id = p_business and status in ('open', 'in_progress');
    return live_now < cap;
  end if;

  select trial_ends_at into trial_end from business_profiles where user_id = p_business;
  if trial_end is null or trial_end <= now() then return false; end if;

  select exists(select 1 from jobs where business_id = p_business) into ever_posted;
  return not ever_posted;
end;
$$;

-- ===== Guards =====
-- Quota is charged when a job is actually taken on — i.e. when an agreement is
-- struck — not when a creative merely applies (applying stays free/unlimited).
create or replace function agreements_quota_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not creative_can_accept(new.creative_id) then
    raise exception 'CREATIVE_QUOTA_EXCEEDED' using errcode = '53400';
  end if;
  new.quota_month := current_quota_month();
  return new;
end;
$$;
create trigger agreements_quota_guard_trg before insert on agreements
  for each row execute function agreements_quota_guard();

create or replace function jobs_quota_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not business_can_post(new.business_id) then
    raise exception 'BUSINESS_QUOTA_EXCEEDED' using errcode = '53400';
  end if;
  return new;
end;
$$;
create trigger jobs_quota_guard_trg before insert on jobs
  for each row execute function jobs_quota_guard();

-- ===== UI read helpers: one round trip each for "where do I stand" =====
create or replace function my_creative_quota()
returns table (
  trialing boolean, trial_ends_at timestamptz,
  plan subscription_plan, monthly_limit integer, used integer, unlimited boolean, can_accept boolean
)
language sql stable security definer set search_path = public as $$
  with me as (select trial_ends_at from creative_profiles where user_id = auth.uid()),
       p  as (select current_creative_plan(auth.uid()) as plan)
  select
    (p.plan is null and me.trial_ends_at > now()),
    me.trial_ends_at,
    p.plan,
    pl.monthly_engagements,
    creative_engagements_used(auth.uid()),
    (p.plan is not null and pl.monthly_engagements is null),
    creative_can_accept(auth.uid())
  from me, p
  left join plan_limits pl on pl.plan = p.plan;
$$;

create or replace function my_business_quota()
returns table (
  trialing boolean, trial_ends_at timestamptz,
  plan subscription_plan, job_cap integer, active_jobs integer, unlimited boolean, can_post boolean
)
language sql stable security definer set search_path = public as $$
  with me as (select trial_ends_at from business_profiles where user_id = auth.uid()),
       p  as (select current_business_plan(auth.uid()) as plan)
  select
    (p.plan is null and me.trial_ends_at > now()),
    me.trial_ends_at,
    p.plan,
    pl.active_job_cap,
    (select count(*)::integer from jobs where business_id = auth.uid() and status in ('open', 'in_progress')),
    (p.plan is not null and pl.active_job_cap is null),
    business_can_post(auth.uid())
  from me, p
  left join plan_limits pl on pl.plan = p.plan;
$$;

-- ===== Applying a subscription — service role only (the Stripe webhook's hand) =====
-- A client that could call this would simply grant itself the unlimited plan,
-- which is the entire subscription business.
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

  -- A creative account cannot be put on the business plan and vice versa —
  -- current_*_plan() looks up by role, so a mismatched row would silently grant
  -- nothing rather than failing loudly.
  if plan_role = 'creative' and not is_creative then
    raise exception 'PLAN_ROLE_MISMATCH' using errcode = '22023';
  end if;
  if plan_role = 'business' and not is_business then
    raise exception 'PLAN_ROLE_MISMATCH' using errcode = '22023';
  end if;

  update subscriptions set status = 'cancelled'
   where user_id = p_user and status = 'active'
     and (p_subscription_ref is null or stripe_subscription_id is distinct from p_subscription_ref);

  insert into subscriptions (
    user_id, plan, status, current_period_start, current_period_end,
    cancel_at_period_end, stripe_customer_id, stripe_subscription_id
  ) values (
    p_user, p_plan, p_status, p_period_start, p_period_end,
    p_cancel_at_period_end, p_customer_ref, p_subscription_ref
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

revoke all on function apply_subscription(
  uuid, subscription_plan, subscription_status, timestamptz, timestamptz, text, text, boolean
) from public, anon, authenticated;
grant execute on function apply_subscription(
  uuid, subscription_plan, subscription_status, timestamptz, timestamptz, text, text, boolean
) to service_role;

grant execute on function
  current_creative_plan(uuid), current_business_plan(uuid),
  creative_engagements_used(uuid, date),
  creative_can_accept(uuid), business_can_post(uuid),
  my_creative_quota(), my_business_quota()
to authenticated;
