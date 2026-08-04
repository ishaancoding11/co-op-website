-- Bug: applying to a job (or the very first swipe/like on either side)
-- violated matches.is_matched's NOT NULL constraint.
--
-- match_guard() (0001_init.sql) assigns is_matched on every insert/update:
--   new.is_matched := (new.business_action = 'liked' and new.creative_action = 'liked')
--                     or new.application_status = 'accepted';
--
-- On a fresh job application, creative_action = 'liked' but business_action
-- is still NULL (the business hasn't acted yet). SQL's three-valued logic
-- means `NULL = 'liked'` is NULL, not false, and NULL propagates through
-- AND/OR (`NULL and true = NULL`, `NULL or false = NULL`) instead of
-- collapsing to false — so is_matched ended up NULL instead of false,
-- which the NOT NULL constraint then rejected. The exact same shape hits
-- the very first swipe on either side of a direct/swipe-sourced match too
-- (whichever action column hasn't been set yet is NULL).
--
-- Fix: coalesce each nullable comparison to false before combining them, so
-- "the other side hasn't acted yet" correctly means "not matched" rather
-- than an undefined tri-state that fails the constraint.
create or replace function public.match_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare was_matched boolean := coalesce(old.is_matched, false);
begin
  if tg_op = 'UPDATE' and auth.uid() is not null then
    if auth.uid() = old.business_id and auth.uid() <> old.creative_id then
      new.creative_action := old.creative_action;
      new.pitch := old.pitch;
      new.pitch_portfolio_ids := old.pitch_portfolio_ids;
    elsif auth.uid() = old.creative_id and auth.uid() <> old.business_id then
      new.business_action := old.business_action;
      new.application_status := old.application_status;
    end if;
  end if;
  -- clients cannot write match state directly
  new.is_matched := coalesce(new.business_action = 'liked' and new.creative_action = 'liked', false)
                    or coalesce(new.application_status = 'accepted', false);
  if new.is_matched and not was_matched then
    new.matched_at := now();
  elsif not new.is_matched then
    new.matched_at := null;
  end if;
  return new;
end;
$$;
