-- Support tickets + business registration number.
--
-- Two small, independent additions that both close gaps in the current build:
--
--   1. Support tickets — a first-party way for a user to reach staff from inside
--      the product, instead of an email address in a footer. Modelled on the
--      existing `reports` queue (open/resolved/dismissed, an admin_* reader and a
--      resolve RPC), but a ticket is raised *by* a user *about their own* problem,
--      so unlike reports it is readable back to its author.
--
--   2. Business registration number — EIN (US) or БИН (Kazakhstan). Co-op does not
--      talk to any government registry (there is no free one to call), so this is
--      a self-declared field: the app validates its *shape* per country and stores
--      it. It is informational for staff verification, never a source of truth.

-- ===== 1. Support tickets =====
-- Reuse the same three-state lifecycle words the reports queue uses so staff have
-- one mental model for both queues.
create type support_status as enum ('open', 'resolved', 'dismissed');

create table if not exists support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  subject     text not null,
  body        text not null,
  status      support_status not null default 'open',
  handled_by  uuid references users(id),
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index support_tickets_status_idx on support_tickets (status, created_at desc);
create index support_tickets_user_idx on support_tickets (user_id, created_at desc);

alter table support_tickets enable row level security;
grant select on support_tickets to authenticated;

-- A user sees their own tickets (to check status); staff see all.
create policy support_read_own on support_tickets for select to authenticated
  using (user_id = auth.uid() or is_staff());

-- Client-callable: raise a ticket for yourself. A security-definer RPC (rather
-- than a bare insert policy) so subject/body are validated in one place and the
-- row's user_id can never be spoofed to someone else.
create or replace function public.create_support_ticket(p_subject text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  ticket_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if coalesce(trim(p_subject), '') = '' then raise exception 'SUBJECT_REQUIRED' using errcode = '22023'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'BODY_REQUIRED' using errcode = '22023'; end if;

  insert into support_tickets (user_id, subject, body)
  values (auth.uid(), left(trim(p_subject), 200), left(trim(p_body), 4000))
  returning id into ticket_id;
  return ticket_id;
end;
$$;

grant execute on function public.create_support_ticket(text, text) to authenticated;

-- Staff queue reader — pending first, mirroring admin_reports.
create or replace function public.admin_support_tickets(p_status support_status default null)
returns table (
  id uuid, user_id uuid, display_name text,
  subject text, body text, status support_status,
  handled_by uuid, handled_at timestamptz, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;
  return query
  select t.id, t.user_id, u.display_name, t.subject, t.body, t.status,
         t.handled_by, t.handled_at, t.created_at
  from support_tickets t
  join users u on u.id = t.user_id
  where p_status is null or t.status = p_status
  order by (t.status = 'open') desc, t.created_at desc;
end;
$$;

create or replace function public.admin_resolve_support_ticket(p_ticket uuid, p_status support_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'STAFF_ONLY' using errcode = '42501'; end if;
  if p_status not in ('resolved', 'dismissed') then raise exception 'INVALID_STATUS' using errcode = '22023'; end if;

  update support_tickets set status = p_status, handled_by = auth.uid(), handled_at = now() where id = p_ticket;
  if not found then raise exception 'TICKET_UNKNOWN' using errcode = '22023'; end if;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'SUPPORT_TICKET_RESOLVED', 'support_ticket', p_ticket, jsonb_build_object('status', p_status));
end;
$$;

revoke all on function
  public.admin_support_tickets(support_status),
  public.admin_resolve_support_ticket(uuid, support_status)
from public, anon;
grant execute on function
  public.admin_support_tickets(support_status),
  public.admin_resolve_support_ticket(uuid, support_status)
to authenticated;

-- ===== 2. Business registration number (EIN / БИН) =====
-- Self-declared, format-checked in the app (saveBusinessProfile) per the owning
-- business's country. Stored as plain text; a light DB check keeps it to the
-- digits/dash shapes both formats use, but the real per-country validation lives
-- in the app so the message can be specific ("EIN is 9 digits").
alter table business_profiles add column if not exists registration_number text
  check (registration_number is null or registration_number ~ '^[0-9-]{9,14}$');
