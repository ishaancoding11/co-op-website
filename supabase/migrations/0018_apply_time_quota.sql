-- Move creative quota enforcement from agreement creation to apply time,
-- for the job_apply path specifically. Previously (0008_subscriptions.sql):
-- "Quota is charged when a job is actually taken on — i.e. when an
-- agreement is struck — not when a creative merely applies." That decision
-- is being deliberately reversed: a creative who has used their trial slot
-- or hit their monthly cap should be blocked from applying at all, not
-- allowed to apply and only stopped later.
--
-- matches.source can be 'job_apply', 'swipe', or 'direct' — an agreement
-- can originate from any of the three, not just an application. Simply
-- deleting the old agreement-time check would leave swipe/direct-sourced
-- deals completely unquota'd; simply leaving it unchanged would let it
-- contradict the new apply-time gate (an application allowed under the new
-- rule could still get blocked from acceptance weeks later by the old,
-- now-parallel agreement counter). So agreements_quota_guard is scoped
-- below to only fire for non-job_apply matches — it remains the real
-- enforcement for swipe/direct, since those never pass through applyToJob.
--
-- The trial's one lifetime slot is unified across both paths: it counts as
-- used the moment a creative has EITHER applied to a job OR had any
-- swipe/direct agreement, whichever happened first — otherwise a trial
-- creative could use one free slot via each path independently.

-- ===== Shared trial-exhaustion check =====
create or replace function creative_ever_engaged(p_creative uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    exists(select 1 from matches where creative_id = p_creative and source = 'job_apply' and creative_action = 'liked')
    or exists(select 1 from agreements where creative_id = p_creative);
$$;

-- ===== Application counting (mirrors creative_engagements_used, but for
-- applications instead of agreements — no stored quota_month needed since
-- an application is an instantaneous event, not a multi-week engagement
-- that can span a month boundary the way an agreement can) =====
create or replace function creative_applications_used(p_creative uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from matches
  where creative_id = p_creative and source = 'job_apply' and creative_action = 'liked'
    and created_at >= current_quota_month()
    and created_at < current_quota_month() + interval '1 month';
$$;

create or replace function creative_can_apply(p_creative uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  plan subscription_plan;
  cap integer;
  trial_end timestamptz;
begin
  plan := current_creative_plan(p_creative);
  if plan is not null then
    select monthly_engagements into cap from plan_limits where plan_limits.plan = plan;
    if cap is null then return true; end if; -- unlimited (premium)
    return creative_applications_used(p_creative) < cap;
  end if;

  select trial_ends_at into trial_end from creative_profiles where user_id = p_creative;
  if trial_end is null or trial_end <= now() then return false; end if;

  return not creative_ever_engaged(p_creative);
end;
$$;

-- creative_can_accept's trial branch now shares the same unified check —
-- its paid-plan branch (agreement-count based) is untouched, since it
-- remains the real cap for the swipe/direct path specifically.
create or replace function creative_can_accept(p_creative uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  plan subscription_plan;
  cap integer;
  trial_end timestamptz;
begin
  plan := current_creative_plan(p_creative);
  if plan is not null then
    select monthly_engagements into cap from plan_limits where plan_limits.plan = plan;
    if cap is null then return true; end if;
    return creative_engagements_used(p_creative) < cap;
  end if;

  select trial_ends_at into trial_end from creative_profiles where user_id = p_creative;
  if trial_end is null or trial_end <= now() then return false; end if;

  return not creative_ever_engaged(p_creative);
end;
$$;

-- ===== New enforcement point: applying =====
-- Fires only on the transition into "this is a live job application" — a
-- fresh INSERT with source='job_apply' and creative_action='liked', or an
-- existing (e.g. previously swiped/passed) match row now being updated into
-- that state. Does not re-fire on later updates to the same row (e.g. the
-- business changing application_status), since creative_action doesn't
-- change again after that point. Also blocks a suspended creative from
-- applying at all — matches doesn't currently have any suspension guard,
-- and "no new commitments while suspended" already applies to jobs,
-- agreements, and messages, so applying should be no exception.
create or replace function matches_application_quota_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.source = 'job_apply' and new.creative_action = 'liked'
     and (tg_op = 'INSERT' or old.creative_action is distinct from 'liked') then
    if not is_account_active(new.creative_id) then
      raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
    end if;
    if not creative_can_apply(new.creative_id) then
      raise exception 'CREATIVE_APPLICATION_QUOTA_EXCEEDED' using errcode = '53400';
    end if;
  end if;
  return new;
end;
$$;
create trigger matches_application_quota_guard_trg before insert or update on matches
  for each row execute function matches_application_quota_guard();

-- ===== Old enforcement point: scoped to swipe/direct only =====
create or replace function agreements_quota_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  origin_source match_source;
begin
  if not is_account_active(new.business_id) or not is_account_active(new.creative_id) then
    raise exception 'ACCOUNT_SUSPENDED' using errcode = '42501';
  end if;

  select source into origin_source from matches where id = new.match_id;
  if origin_source is distinct from 'job_apply' and not creative_can_accept(new.creative_id) then
    raise exception 'CREATIVE_QUOTA_EXCEEDED' using errcode = '53400';
  end if;

  new.quota_month := current_quota_month();
  return new;
end;
$$;

-- ===== UI read helper: report application-based usage, matching what's
-- actually enforced now. can_accept renamed to can_apply — same rename
-- needs to land in app/billing/page.tsx's CreativeQuota type. =====
create or replace function my_creative_quota()
returns table (
  trialing boolean, trial_ends_at timestamptz,
  plan subscription_plan, monthly_limit integer, used integer, unlimited boolean, can_apply boolean
)
language sql stable security definer set search_path = public as $$
  with me as (select trial_ends_at from creative_profiles where user_id = auth.uid()),
       p  as (select current_creative_plan(auth.uid()) as plan)
  select
    (p.plan is null and me.trial_ends_at > now()),
    me.trial_ends_at,
    p.plan,
    pl.monthly_engagements,
    creative_applications_used(auth.uid()),
    (p.plan is not null and pl.monthly_engagements is null),
    creative_can_apply(auth.uid())
  from me, p
  left join plan_limits pl on pl.plan = p.plan;
$$;

revoke all on function
  creative_ever_engaged(uuid), creative_applications_used(uuid), creative_can_apply(uuid)
from public, anon;
grant execute on function
  creative_ever_engaged(uuid), creative_applications_used(uuid), creative_can_apply(uuid)
to authenticated;
