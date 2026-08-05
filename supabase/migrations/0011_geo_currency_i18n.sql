-- Multi-currency + multi-country + locale groundwork.
--
-- Co-op is expanding from the Newport Beach (US/USD) pilot to also cover
-- Kazakhstan (KZT). Two things follow from that:
--
--   1. Every money-bearing row needs to know *which* currency its number is in,
--      so "200" renders as "$200" for a US job and "₸200" for a KZ one. We tag
--      the row with a currency rather than converting amounts: these are
--      indicative budget/rate ranges (round numbers, never charged — Co-op takes
--      no commission), so cent/tiyn precision buys nothing here. The only money
--      that is actually charged is a subscription, and plan_limits already holds
--      those in minor units (cents).
--
--   2. The UI needs to speak EN / RU / KK. The language itself is a client
--      concern (see lib/i18n), but a user's preference is stored here so it
--      survives across devices, and country is recorded so we can default it.
--
-- Currency is denormalised onto each money row (not derived through a join)
-- because almost every list/detail query already selects the row and passing a
-- currency alongside the amount keeps formatting a pure, join-free function of
-- the row it is rendering.

-- ===== Currency & country =====
create type currency as enum ('USD', 'KZT');
create type country  as enum ('US', 'KZ');

-- Which rail settles a subscription in a given currency. Stripe does not operate
-- in Kazakhstan (not payments, not payouts), so a KZT subscription cannot go
-- through Stripe Checkout — it takes the manual/admin-confirmed path instead.
-- USD stays on Stripe. A future Kaspi integration would slot in as another arm
-- of this same function rather than being wired through the app.
create or replace function public.provider_for(p_currency currency) returns text
language sql immutable set search_path = public as $$
  select case when p_currency = 'KZT' then 'manual' else 'stripe' end;
$$;

-- ===== Money rows get a currency tag (default USD = the existing pilot) =====
alter table jobs               add column if not exists currency currency not null default 'USD';
alter table creative_profiles  add column if not exists currency currency not null default 'USD';
alter table business_profiles  add column if not exists currency currency not null default 'USD';
alter table packages           add column if not exists currency currency not null default 'USD';
alter table agreements         add column if not exists currency currency not null default 'USD';

-- Known Kazakhstan cities. Existing rows are all Newport Beach, so this is a
-- no-op today, but it makes the backfill correct the moment KZ data arrives and
-- documents the mapping in one place.
create or replace function public.currency_for_place(p_place text) returns currency
language sql immutable set search_path = public as $$
  select case
    when lower(coalesce(p_place, '')) in (
      'almaty', 'astana', 'nur-sultan', 'shymkent', 'karaganda', 'aktobe',
      'taraz', 'pavlodar', 'ust-kamenogorsk', 'oskemen', 'semey', 'atyrau',
      'kostanay', 'kyzylorda', 'aktau', 'petropavl', 'oral', 'temirtau',
      'алматы', 'астана', 'шымкент', 'караганда', 'актобе', 'тараз'
    ) then 'KZT'::currency
    else 'USD'::currency
  end;
$$;

update jobs               set currency = public.currency_for_place(location)     where currency = 'USD';
update business_profiles  set currency = public.currency_for_place(neighborhood) where currency = 'USD';
update creative_profiles  set currency = public.currency_for_place(neighborhood) where currency = 'USD';

-- A package is priced in its owning creative's currency, and an agreement in the
-- currency of the job it fulfils (or, for a direct match with no job, the
-- business's). Derive both from the rows just backfilled above so a KZ creative's
-- package doesn't render as "$" and an agreement carries the right symbol.
-- Agreements also get this at write time (see createAgreement). Packages have no
-- create path in the app yet — they come from seed data — so this backfill is
-- what keeps them correct; a future package-create action must set currency too.
update packages p set currency = cp.currency
  from creative_profiles cp
 where cp.user_id = p.creative_id and p.currency = 'USD';

update agreements a set currency = j.currency
  from jobs j
 where j.id = a.job_id and a.currency = 'USD';

update agreements a set currency = bp.currency
  from business_profiles bp
 where bp.user_id = a.business_id and a.job_id is null and a.currency = 'USD';

-- ===== Subscription pricing in tenge (display + manual-path collection) =====
-- USD prices (price_*_cents) still drive Stripe Checkout. These KZT figures are
-- what a Kazakhstan user is shown and what the manual path collects. Nullable:
-- a plan with no KZT price simply isn't offered in tenge. Whole tenge (not
-- tiyn) — subscription prices are round, and no gateway settles fractional KZT.
alter table plan_limits add column if not exists price_monthly_kzt integer;
alter table plan_limits add column if not exists price_annual_kzt  integer;

update plan_limits set price_monthly_kzt = 5990,  price_annual_kzt = 59900  where plan = 'creative_basic';
update plan_limits set price_monthly_kzt = 9990,  price_annual_kzt = 99900  where plan = 'creative_premium';
update plan_limits set price_monthly_kzt = 27990, price_annual_kzt = 279900 where plan = 'business_standard';

-- A KZT subscription is not confirmed by a Stripe webhook, so it needs a manual
-- lane: the user requests it, an admin confirms payment received, and only then
-- does apply_subscription() run. This flag lets the billing UI and admin queue
-- distinguish "awaiting manual confirmation" from a live Stripe subscription.
-- (apply_subscription itself is unchanged — the admin action calls it.)
alter table subscriptions add column if not exists currency currency not null default 'USD';
alter table subscriptions add column if not exists provider text not null default 'stripe'
  check (provider in ('stripe', 'manual'));

-- ===== User locale & country =====
alter table users add column if not exists preferred_locale text not null default 'en'
  check (preferred_locale in ('en', 'ru', 'kk'));
alter table users add column if not exists country country not null default 'US';

-- Own row only; keeps the client-writable surface identical to the rest of the
-- users table (users_update policy in 0001 already scopes to id = auth.uid()).
-- No new policy needed — the existing update policy covers these columns.

-- ===== Manual subscription request (KZT) =====
-- Client-callable: records an intent to subscribe in tenge. It never grants the
-- plan (that is apply_subscription, admin-only) — it only creates a pending
-- request an admin can see and confirm. Returns the pending subscription row id.
create table if not exists manual_subscription_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  plan         subscription_plan not null,
  "interval"   text not null check ("interval" in ('monthly', 'annual')),
  amount_kzt   integer not null,
  status       text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  handled_by   uuid references users(id),
  handled_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index manual_sub_requests_status_idx on manual_subscription_requests (status, created_at desc);
create index manual_sub_requests_user_idx on manual_subscription_requests (user_id, created_at desc);

alter table manual_subscription_requests enable row level security;
grant select, insert on manual_subscription_requests to authenticated;
create policy manual_sub_read_own on manual_subscription_requests for select to authenticated
  using (user_id = auth.uid() or is_staff());

create or replace function public.request_manual_subscription(p_plan subscription_plan, p_interval text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  amount integer;
  plan_role text;
  is_creative boolean;
  is_business boolean;
  req_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_interval not in ('monthly', 'annual') then raise exception 'INVALID_INTERVAL' using errcode = '22023'; end if;

  select role into plan_role from plan_limits where plan = p_plan;
  select exists(select 1 from creative_profiles where user_id = auth.uid()) into is_creative;
  select exists(select 1 from business_profiles where user_id = auth.uid()) into is_business;
  if plan_role = 'creative' and not is_creative then raise exception 'PLAN_ROLE_MISMATCH' using errcode = '22023'; end if;
  if plan_role = 'business' and not is_business then raise exception 'PLAN_ROLE_MISMATCH' using errcode = '22023'; end if;

  select case when p_interval = 'annual' then price_annual_kzt else price_monthly_kzt end
    into amount from plan_limits where plan = p_plan;
  if amount is null then raise exception 'PLAN_NOT_OFFERED_IN_KZT' using errcode = '22023'; end if;

  insert into manual_subscription_requests (user_id, plan, "interval", amount_kzt)
  values (auth.uid(), p_plan, p_interval, amount)
  returning id into req_id;
  return req_id;
end;
$$;

grant execute on function public.provider_for(currency), public.currency_for_place(text),
  public.request_manual_subscription(subscription_plan, text) to authenticated;

-- ===== Admin: confirm/reject a manual KZT request =====
-- Confirming grants a one-month (or one-year) subscription via the same
-- apply_subscription() the Stripe webhook uses, so a manually paid tenge
-- subscription is indistinguishable from a Stripe one everywhere downstream.
create or replace function public.admin_resolve_manual_subscription(p_request uuid, p_confirm boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  req manual_subscription_requests;
  period_end timestamptz;
begin
  if not is_admin() then raise exception 'ADMIN_ONLY' using errcode = '42501'; end if;

  select * into req from manual_subscription_requests where id = p_request and status = 'pending';
  if req is null then raise exception 'REQUEST_UNKNOWN' using errcode = '22023'; end if;

  if p_confirm then
    period_end := now() + (case when req."interval" = 'annual' then interval '1 year' else interval '1 month' end);
    perform apply_subscription(
      req.user_id, req.plan, 'active'::subscription_status, now(), period_end,
      null, 'manual:' || req.id::text, false
    );
    update subscriptions set currency = 'KZT', provider = 'manual'
      where stripe_subscription_id = 'manual:' || req.id::text;
  end if;

  update manual_subscription_requests
     set status = case when p_confirm then 'confirmed' else 'rejected' end,
         handled_by = auth.uid(), handled_at = now()
   where id = p_request;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'MANUAL_SUBSCRIPTION_RESOLVED', 'manual_subscription_request', p_request,
          jsonb_build_object('confirmed', p_confirm, 'plan', req.plan, 'amount_kzt', req.amount_kzt));
end;
$$;

create or replace function public.admin_manual_subscription_queue()
returns table (
  id uuid, user_id uuid, display_name text, plan subscription_plan,
  "interval" text, amount_kzt integer, status text, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;
  return query
  select r.id, r.user_id, u.display_name, r.plan, r."interval", r.amount_kzt, r.status, r.created_at
  from manual_subscription_requests r
  join users u on u.id = r.user_id
  order by (r.status = 'pending') desc, r.created_at desc;
end;
$$;

revoke all on function
  public.admin_resolve_manual_subscription(uuid, boolean),
  public.admin_manual_subscription_queue()
from public, anon;
grant execute on function
  public.admin_resolve_manual_subscription(uuid, boolean),
  public.admin_manual_subscription_queue()
to authenticated;
