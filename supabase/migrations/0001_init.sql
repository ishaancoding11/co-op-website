-- Co-op initial schema. Run in Supabase SQL editor (or supabase db push).

-- ===== Enums =====
create type creative_category as enum ('photographer','graphic_designer','videographer','brand_designer','muralist','content_creator','musician');
create type match_source as enum ('swipe','job_apply','direct');
create type swipe_action as enum ('liked','passed');
create type application_status as enum ('applied','shortlisted','accepted','declined');
create type job_status as enum ('open','in_progress','completed','closed');
create type agreement_status as enum ('requested','accepted','in_progress','completed','cancelled');
create type media_type as enum ('image','video','audio','link');
create type portfolio_source as enum ('uploaded','completed_job');
create type notification_type as enum ('new_match','new_message','job_application','application_accepted','review_request','review_received','agreement_update');
create type report_status as enum ('open','resolved','dismissed');
create type package_tier as enum ('basic','standard','premium');

-- ===== Tables =====
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);

create table creative_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  bio text,
  neighborhood text,
  categories creative_category[] not null default '{}',
  rate_min int,
  rate_max int,
  availability text,
  response_time_hours int,
  avatar_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create index creative_profiles_categories_idx on creative_profiles using gin (categories);
create index creative_profiles_neighborhood_idx on creative_profiles (neighborhood);

create table business_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  business_name text not null,
  category text,
  neighborhood text,
  needs creative_category[] not null default '{}',
  budget_band text,
  brand_vibe_tags text[] not null default '{}',
  logo_url text,
  verification_email text,
  is_verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table freemail_domains (
  domain text primary key
);
insert into freemail_domains (domain) values
  ('gmail.com'),('yahoo.com'),('outlook.com'),('hotmail.com'),('icloud.com'),
  ('aol.com'),('live.com'),('msn.com'),('proton.me'),('protonmail.com'),
  ('mail.com'),('gmx.com'),('yandex.com'),('zoho.com'),('me.com'),('ymail.com');

create table business_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references business_profiles(user_id) on delete cascade,
  email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index business_verifications_user_idx on business_verifications (user_id);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_profiles(user_id) on delete cascade,
  title text not null,
  description text not null,
  category creative_category not null,
  budget_min int,
  budget_max int,
  deadline date,
  location text,
  status job_status not null default 'open',
  created_at timestamptz not null default now()
);
create index jobs_feed_idx on jobs (status, category, created_at desc);
create index jobs_business_idx on jobs (business_id);

create table matches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_profiles(user_id) on delete cascade,
  creative_id uuid not null references creative_profiles(user_id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  source match_source not null,
  pitch text,
  pitch_portfolio_ids uuid[] not null default '{}',
  business_action swipe_action,
  creative_action swipe_action,
  application_status application_status,
  is_matched boolean not null default false,
  matched_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index matches_pair_job_uniq on matches (business_id, creative_id, coalesce(job_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index matches_business_idx on matches (business_id);
create index matches_creative_idx on matches (creative_id);
create index matches_job_idx on matches (job_id, application_status);

create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_thread_idx on messages (match_id, created_at);

create table packages (
  id uuid primary key default gen_random_uuid(),
  creative_id uuid not null references creative_profiles(user_id) on delete cascade,
  tier package_tier not null,
  title text not null,
  deliverables text[] not null default '{}',
  turnaround_days int,
  revisions int,
  price int not null,
  unique (creative_id, tier)
);

create table agreements (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  business_id uuid not null references business_profiles(user_id) on delete cascade,
  creative_id uuid not null references creative_profiles(user_id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  package_id uuid references packages(id) on delete set null,
  scope text,
  agreed_price int,
  status agreement_status not null default 'requested',
  completed_by_business_at timestamptz,
  completed_by_creative_at timestamptz,
  -- V2 stubs: optional zero-commission pass-through payments. Unused in MVP.
  payment_status text,
  payment_ref text,
  created_at timestamptz not null default now()
);
create index agreements_business_idx on agreements (business_id);
create index agreements_creative_idx on agreements (creative_id);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id) on delete cascade,
  reviewer_id uuid not null references users(id) on delete cascade,
  reviewee_id uuid not null references users(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  unique (agreement_id, reviewer_id)
);
create index reviews_reviewee_idx on reviews (reviewee_id);

create table portfolio_items (
  id uuid primary key default gen_random_uuid(),
  creative_id uuid not null references creative_profiles(user_id) on delete cascade,
  media_url text,
  media_type media_type not null default 'image',
  caption text,
  source portfolio_source not null default 'uploaded',
  job_id uuid references jobs(id) on delete set null,
  is_hidden boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index portfolio_creative_idx on portfolio_items (creative_id, is_hidden, sort_order);

create table musician_details (
  creative_id uuid primary key references creative_profiles(user_id) on delete cascade,
  venues jsonb not null default '[]',
  audio_links text[] not null default '{}',
  video_links text[] not null default '{}',
  rate_per_set_min int,
  rate_per_set_max int
);

create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  saved_creative_id uuid references creative_profiles(user_id) on delete cascade,
  saved_job_id uuid references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(saved_creative_id, saved_job_id) = 1)
);
create unique index favorites_creative_uniq on favorites (user_id, saved_creative_id) where saved_creative_id is not null;
create unique index favorites_job_uniq on favorites (user_id, saved_job_id) where saved_job_id is not null;

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type notification_type not null,
  content jsonb not null default '{}',
  is_read boolean not null default false,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, is_read, created_at desc);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  reported_user_id uuid not null references users(id) on delete cascade,
  reason text not null,
  details text,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table blocked_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  blocked_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, blocked_user_id)
);

-- ===== Helper functions =====
create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocked_users
    where (user_id = a and blocked_user_id = b)
       or (user_id = b and blocked_user_id = a)
  );
$$;

create or replace function public.notify(p_user uuid, p_type notification_type, p_content jsonb)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, content) values (p_user, p_type, p_content);
$$;

-- Auto-create public.users row for each new auth user
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Match state machine =====
-- Each side may only touch its own columns; is_matched/matched_at are trigger-owned.
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
  new.is_matched := (new.business_action = 'liked' and new.creative_action = 'liked')
                    or new.application_status = 'accepted';
  if new.is_matched and not was_matched then
    new.matched_at := now();
  elsif not new.is_matched then
    new.matched_at := null;
  end if;
  return new;
end;
$$;
create trigger match_guard_trg before insert or update on matches
  for each row execute function public.match_guard();

create or replace function public.match_side_effects() returns trigger
language plpgsql security definer set search_path = public as $$
declare biz_name text; creative_name text;
begin
  if new.is_matched and (tg_op = 'INSERT' or not old.is_matched) then
    select business_name into biz_name from business_profiles where user_id = new.business_id;
    select display_name into creative_name from users where id = new.creative_id;
    perform public.notify(new.business_id, 'new_match', jsonb_build_object('title','It''s a match!','body','You and '||coalesce(creative_name,'a creative')||' can now message each other.','href','/messages/'||new.id));
    perform public.notify(new.creative_id, 'new_match', jsonb_build_object('title','It''s a match!','body','You and '||coalesce(biz_name,'a business')||' can now message each other.','href','/messages/'||new.id));
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
create trigger match_side_effects_trg after insert or update on matches
  for each row execute function public.match_side_effects();

-- New-message notification
create or replace function public.message_side_effects() returns trigger
language plpgsql security definer set search_path = public as $$
declare recipient uuid; sender_name text;
begin
  select case when m.business_id = new.sender_id then m.creative_id else m.business_id end
    into recipient from matches m where m.id = new.match_id;
  select display_name into sender_name from users where id = new.sender_id;
  perform public.notify(recipient, 'new_message', jsonb_build_object('title','New message','body',coalesce(sender_name,'Someone')||' sent you a message.','href','/messages/'||new.match_id));
  return new;
end;
$$;
create trigger message_side_effects_trg after insert on messages
  for each row execute function public.message_side_effects();

-- ===== Agreement completion =====
-- Each side stamps its own completed_by_*; status flips when both exist.
create or replace function public.agreement_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and auth.uid() is not null then
    if auth.uid() = old.business_id and auth.uid() <> old.creative_id then
      new.completed_by_creative_at := old.completed_by_creative_at;
    elsif auth.uid() = old.creative_id and auth.uid() <> old.business_id then
      new.completed_by_business_at := old.completed_by_business_at;
    end if;
    -- payment fields are V2; never client-writable
    new.payment_status := old.payment_status;
    new.payment_ref := old.payment_ref;
  end if;
  if new.completed_by_business_at is not null and new.completed_by_creative_at is not null then
    new.status := 'completed';
  end if;
  return new;
end;
$$;
create trigger agreement_guard_trg before update on agreements
  for each row execute function public.agreement_guard();

create or replace function public.agreement_side_effects() returns trigger
language plpgsql security definer set search_path = public as $$
declare job_title text;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if new.job_id is not null then
      update jobs set status = 'completed' where id = new.job_id;
      select title into job_title from jobs where id = new.job_id;
    end if;
    -- Auto-portfolio: completed job appears on the creative's portfolio (hideable)
    insert into portfolio_items (creative_id, media_type, caption, source, job_id)
    values (new.creative_id, 'link', coalesce(job_title, new.scope, 'Completed project'), 'completed_job', new.job_id);
    perform public.notify(new.business_id, 'review_request', jsonb_build_object('title','How did it go?','body','Leave a review for your creative.','href','/agreements/'||new.id));
    perform public.notify(new.creative_id, 'review_request', jsonb_build_object('title','How did it go?','body','Leave a review for the business.','href','/agreements/'||new.id));
  elsif new.status is distinct from old.status then
    perform public.notify(new.business_id, 'agreement_update', jsonb_build_object('title','Agreement updated','body','Status: '||new.status,'href','/agreements/'||new.id));
    perform public.notify(new.creative_id, 'agreement_update', jsonb_build_object('title','Agreement updated','body','Status: '||new.status,'href','/agreements/'||new.id));
  end if;
  return new;
end;
$$;
create trigger agreement_side_effects_trg after update on agreements
  for each row execute function public.agreement_side_effects();

-- Review received notification
create or replace function public.review_side_effects() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.reviewee_id, 'review_received', jsonb_build_object('title','New review','body','You received a '||new.stars||'-star review.','href','/dashboard'));
  return new;
end;
$$;
create trigger review_side_effects_trg after insert on reviews
  for each row execute function public.review_side_effects();

-- ===== Business verification (server-safe via security definer RPCs) =====
create or replace function public.start_business_verification(p_email text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare raw_token text; dom text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from business_profiles where user_id = auth.uid()) then
    raise exception 'no_business_profile';
  end if;
  dom := lower(split_part(p_email, '@', 2));
  if dom = '' then raise exception 'invalid_email'; end if;
  if exists (select 1 from freemail_domains where domain = dom) then
    raise exception 'freemail_domain_not_allowed';
  end if;
  raw_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into business_verifications (user_id, email, token_hash, expires_at)
  values (auth.uid(), p_email, encode(extensions.digest(raw_token, 'sha256'), 'hex'), now() + interval '24 hours');
  update business_profiles set verification_email = p_email where user_id = auth.uid();
  return raw_token; -- caller (server action) emails the link; never shown to the browser
end;
$$;

create or replace function public.confirm_business_verification(p_token text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v record;
begin
  select * into v from business_verifications
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and confirmed_at is null and expires_at > now()
  order by created_at desc limit 1;
  if v is null then return false; end if;
  update business_verifications set confirmed_at = now() where id = v.id;
  update business_profiles set is_verified = true, verified_at = now() where user_id = v.user_id;
  return true;
end;
$$;

-- ===== RLS =====
alter table users enable row level security;
alter table creative_profiles enable row level security;
alter table business_profiles enable row level security;
alter table freemail_domains enable row level security;
alter table business_verifications enable row level security;
alter table jobs enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;
alter table packages enable row level security;
alter table agreements enable row level security;
alter table reviews enable row level security;
alter table portfolio_items enable row level security;
alter table musician_details enable row level security;
alter table favorites enable row level security;
alter table notifications enable row level security;
alter table reports enable row level security;
alter table blocked_users enable row level security;

-- users
create policy users_select on users for select to authenticated using (true);
create policy users_update on users for update to authenticated using (id = auth.uid());

-- creative_profiles: public read of public profiles (anon included), blocked pairs hidden
create policy creative_select on creative_profiles for select using (
  user_id = auth.uid()
  or (is_public and not public.is_blocked(auth.uid(), user_id))
);
create policy creative_insert on creative_profiles for insert to authenticated with check (user_id = auth.uid());
create policy creative_update on creative_profiles for update to authenticated using (user_id = auth.uid());

-- business_profiles: readable to signed-in users; owner writes; is_verified only via RPC
create policy business_select on business_profiles for select using (
  user_id = auth.uid() or not public.is_blocked(auth.uid(), user_id)
);
create policy business_insert on business_profiles for insert to authenticated with check (user_id = auth.uid());
create policy business_update on business_profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and is_verified = (select bp.is_verified from business_profiles bp where bp.user_id = auth.uid()));

-- freemail_domains: readable (client-side hint), edited only in dashboard
create policy freemail_select on freemail_domains for select using (true);

-- business_verifications: no client access (RPCs only)

-- jobs
create policy jobs_select on jobs for select using (
  business_id = auth.uid()
  or (status = 'open' and not public.is_blocked(auth.uid(), business_id))
  or exists (select 1 from matches m where m.job_id = jobs.id and m.creative_id = auth.uid())
);
create policy jobs_insert on jobs for insert to authenticated with check (
  business_id = auth.uid()
  and exists (select 1 from business_profiles bp where bp.user_id = auth.uid() and bp.is_verified)
);
create policy jobs_update on jobs for update to authenticated using (business_id = auth.uid());
create policy jobs_delete on jobs for delete to authenticated using (business_id = auth.uid());

-- matches
create policy matches_select on matches for select to authenticated using (auth.uid() in (business_id, creative_id));
create policy matches_insert on matches for insert to authenticated with check (
  auth.uid() in (business_id, creative_id)
  and not public.is_blocked(business_id, creative_id)
  and (job_id is null or exists (select 1 from jobs j where j.id = job_id and j.status = 'open'))
);
create policy matches_update on matches for update to authenticated using (auth.uid() in (business_id, creative_id));

-- messages
create policy messages_select on messages for select to authenticated using (
  exists (select 1 from matches m where m.id = match_id and auth.uid() in (m.business_id, m.creative_id))
);
create policy messages_insert on messages for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (
    select 1 from matches m
    where m.id = match_id and m.is_matched
      and auth.uid() in (m.business_id, m.creative_id)
      and not public.is_blocked(m.business_id, m.creative_id)
  )
);
create policy messages_update on messages for update to authenticated using (
  -- recipient marks read
  exists (select 1 from matches m where m.id = match_id and auth.uid() in (m.business_id, m.creative_id) and sender_id <> auth.uid())
);

-- packages
create policy packages_select on packages for select using (true);
create policy packages_write on packages for all to authenticated using (creative_id = auth.uid()) with check (creative_id = auth.uid());

-- agreements
create policy agreements_select on agreements for select to authenticated using (auth.uid() in (business_id, creative_id));
create policy agreements_insert on agreements for insert to authenticated with check (
  auth.uid() in (business_id, creative_id)
  and exists (select 1 from matches m where m.id = match_id and m.is_matched and auth.uid() in (m.business_id, m.creative_id))
);
create policy agreements_update on agreements for update to authenticated using (auth.uid() in (business_id, creative_id));

-- reviews: public reputation
create policy reviews_select on reviews for select using (true);
create policy reviews_insert on reviews for insert to authenticated with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from agreements a
    where a.id = agreement_id and a.status = 'completed'
      and auth.uid() in (a.business_id, a.creative_id)
      and reviewee_id in (a.business_id, a.creative_id)
      and reviewee_id <> auth.uid()
  )
);

-- portfolio_items
create policy portfolio_select on portfolio_items for select using (
  creative_id = auth.uid()
  or (is_hidden = false and exists (select 1 from creative_profiles cp where cp.user_id = creative_id and cp.is_public))
);
create policy portfolio_write on portfolio_items for all to authenticated using (creative_id = auth.uid()) with check (creative_id = auth.uid());

-- musician_details
create policy musician_select on musician_details for select using (
  creative_id = auth.uid()
  or exists (select 1 from creative_profiles cp where cp.user_id = creative_id and cp.is_public)
);
create policy musician_write on musician_details for all to authenticated using (creative_id = auth.uid()) with check (creative_id = auth.uid());

-- favorites
create policy favorites_all on favorites for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications: owner read/mark-read; inserts only via security definer notify()
create policy notifications_select on notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on notifications for update to authenticated using (user_id = auth.uid());

-- reports: write-only capture
create policy reports_insert on reports for insert to authenticated with check (reporter_id = auth.uid());

-- blocked_users
create policy blocked_all on blocked_users for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== Realtime =====
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;

-- ===== Storage buckets =====
insert into storage.buckets (id, name, public) values ('avatars','avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('portfolio','portfolio', true) on conflict do nothing;

create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars owner write" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars owner update" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars owner delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "portfolio public read" on storage.objects for select using (bucket_id = 'portfolio');
create policy "portfolio owner write" on storage.objects for insert to authenticated with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "portfolio owner update" on storage.objects for update to authenticated using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "portfolio owner delete" on storage.objects for delete to authenticated using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

-- pgcrypto for gen_random_bytes / digest (Supabase ships it in extensions schema)
create extension if not exists pgcrypto with schema extensions;
