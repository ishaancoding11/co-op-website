-- Rolls back the Kazakhstan/KZT-specific parts of 0011_geo_currency_i18n.sql,
-- which already ran against this database. Co-op is proceeding EN + RU,
-- subscription-only, no commission — matching the live product's business
-- model — so the multi-currency/multi-country direction is being dropped,
-- not paused. This does NOT touch anything from 0012_support_and_registration.sql
-- (support tickets, business registration numbers) — both stay, they were
-- never Kazakhstan-specific.
--
-- 0011_geo_currency_i18n.sql itself is left unedited in the repo: it's a
-- historical record of what was actually run, and rewriting an
-- already-applied migration in place would make the file lie about what
-- happened. This migration is the real, reviewable record of the rollback.
--
-- Dependency order matters here: functions referencing the `currency` type
-- are dropped before any column of that type, and every column of that type
-- is dropped before the type itself.

-- ===== 1. Functions =====
drop function if exists public.admin_manual_subscription_queue();
drop function if exists public.admin_resolve_manual_subscription(uuid, boolean);
drop function if exists public.request_manual_subscription(subscription_plan, text);
drop function if exists public.currency_for_place(text);
drop function if exists public.provider_for(currency);

-- ===== 2. Manual (Kaspi/bank-transfer) subscription request table =====
-- DROP TABLE removes its own indexes, RLS policies, and grants — nothing
-- else to clean up separately.
drop table if exists manual_subscription_requests;

-- ===== 3. Currency-tag columns (money rows) =====
alter table jobs               drop column if exists currency;
alter table creative_profiles  drop column if exists currency;
alter table business_profiles  drop column if exists currency;
alter table packages           drop column if exists currency;
alter table agreements         drop column if exists currency;

-- ===== 4. Subscription rail columns (KZT manual-pay path) =====
alter table subscriptions drop column if exists currency;
alter table subscriptions drop column if exists provider;

-- ===== 5. Tenge pricing on the plan catalog =====
alter table plan_limits drop column if exists price_monthly_kzt;
alter table plan_limits drop column if exists price_annual_kzt;

-- ===== 6. Country (was only ever used to pick a currency/payment rail) =====
alter table users drop column if exists country;
drop type if exists country;

-- ===== 7. Locale: keep EN/RU, drop Kazakh =====
-- Backfill first so no row is left violating the tightened constraint, then
-- replace whatever check constraint 0011 created — looked up dynamically
-- since it wasn't given an explicit name there.
update users set preferred_locale = 'en' where preferred_locale = 'kk';

do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'users'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%preferred_locale%'
  loop
    execute format('alter table users drop constraint %I', con.conname);
  end loop;
end $$;

alter table users add constraint users_preferred_locale_check check (preferred_locale in ('en', 'ru'));

-- ===== 8. The currency type itself =====
-- Must be last: every column and function referencing it is already gone.
drop type if exists currency;
