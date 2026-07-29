-- Item 2: free-text description of what a business typically needs
alter table business_profiles add column if not exists needs_description text;

-- Item 11: soft geolocation signal captured at onboarding (never used for verification)
alter table creative_profiles add column if not exists latitude double precision;
alter table creative_profiles add column if not exists longitude double precision;
alter table business_profiles add column if not exists latitude double precision;
alter table business_profiles add column if not exists longitude double precision;

-- Item 9: roles are locked at signup — one account is either a creative or a business, never both.
create or replace function public.enforce_single_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'creative_profiles'
     and exists (select 1 from business_profiles where user_id = new.user_id) then
    raise exception 'role_locked: this account is registered as a business';
  end if;
  if tg_table_name = 'business_profiles'
     and exists (select 1 from creative_profiles where user_id = new.user_id) then
    raise exception 'role_locked: this account is registered as a creative';
  end if;
  return new;
end;
$$;
drop trigger if exists single_role_creative on creative_profiles;
create trigger single_role_creative before insert on creative_profiles
  for each row execute function public.enforce_single_role();
drop trigger if exists single_role_business on business_profiles;
create trigger single_role_business before insert on business_profiles
  for each row execute function public.enforce_single_role();

-- Item 8: self-service account deletion. Deleting the auth user cascades to
-- public.users and from there to every app table (profiles, matches, messages,
-- jobs, reviews, portfolio, notifications…). Uploaded storage files are not
-- deleted automatically (no FK) — acceptable for MVP, noted in NOTES.md.
create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
