-- BSSB Event Registration — Supabase schema (run once in SQL Editor)
-- Capacity optional; party maxes admin-configurable; unique key = phone per event.

create extension if not exists "pgcrypto";

create table if not exists public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  location text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  -- null = unlimited headcount
  capacity integer check (capacity is null or capacity > 0),
  -- null = no per-registration upper bound (app uses a safety ceiling)
  -- defaults below are Navratri-sensible for new events in the admin UI
  max_adults integer check (max_adults is null or max_adults >= 1),
  max_children integer check (max_children is null or max_children >= 0),
  is_published boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  full_name text not null,
  email text,
  phone text not null,
  adults_count integer not null default 1 check (adults_count >= 1),
  children_count integer not null default 0 check (children_count >= 0),
  dandiya_sets integer not null default 0 check (dandiya_sets >= 0),
  samosas integer not null default 0 check (samosas >= 0),
  kachoris integer not null default 0 check (kachoris >= 0),
  teas integer not null default 0 check (teas >= 0),
  jalebis integer not null default 0 check (jalebis >= 0),
  payment_acknowledged boolean not null default false,
  data_consent boolean not null default false,
  comments text,
  created_at timestamptz not null default now(),
  unique (event_id, phone)
);

create index if not exists registrations_event_id_idx on public.registrations (event_id);
create index if not exists events_starts_at_idx on public.events (starts_at desc);

create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(trim(coalesce(p_phone, '')), '[^0-9+]', '', 'g'),
    ''
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_emails a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create or replace function public.event_registration_count(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(adults_count + children_count), 0)::integer
  from public.registrations
  where event_id = p_event_id;
$$;

grant execute on function public.event_registration_count(uuid) to anon, authenticated;
grant execute on function public.normalize_phone(text) to anon, authenticated;

create or replace function public.register_attendee(
  p_event_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_adults_count integer,
  p_children_count integer,
  p_dandiya_sets integer,
  p_samosas integer,
  p_kachoris integer,
  p_teas integer,
  p_jalebis integer,
  p_payment_acknowledged boolean,
  p_data_consent boolean,
  p_comments text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_count integer;
  v_party integer;
  v_phone text;
  v_email text;
  v_id uuid;
  v_max_adults integer;
  v_max_children integer;
begin
  if p_payment_acknowledged is not true then
    raise exception 'PAYMENT_ACK_REQUIRED';
  end if;
  if p_data_consent is not true then
    raise exception 'CONSENT_REQUIRED';
  end if;

  v_phone := public.normalize_phone(p_phone);
  if v_phone is null then
    raise exception 'PHONE_REQUIRED';
  end if;

  v_email := nullif(lower(trim(coalesce(p_email, ''))), '');

  if p_adults_count is null or p_adults_count < 1 then
    raise exception 'INVALID_ADULTS';
  end if;
  if p_children_count is null or p_children_count < 0 then
    raise exception 'INVALID_CHILDREN';
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found or v_event.is_published is not true then
    raise exception 'EVENT_CLOSED';
  end if;

  v_max_adults := coalesce(v_event.max_adults, 200);
  v_max_children := coalesce(v_event.max_children, 200);
  if p_adults_count > v_max_adults then
    raise exception 'INVALID_ADULTS';
  end if;
  if p_children_count > v_max_children then
    raise exception 'INVALID_CHILDREN';
  end if;

  v_party := p_adults_count + p_children_count;
  select public.event_registration_count(p_event_id) into v_count;

  -- capacity null = unlimited
  if v_event.capacity is not null and (v_count + v_party) > v_event.capacity then
    raise exception 'EVENT_FULL';
  end if;

  insert into public.registrations (
    event_id, full_name, email, phone,
    adults_count, children_count,
    dandiya_sets, samosas, kachoris, teas, jalebis,
    payment_acknowledged, data_consent, comments
  )
  values (
    p_event_id,
    trim(p_full_name),
    v_email,
    v_phone,
    p_adults_count,
    p_children_count,
    greatest(coalesce(p_dandiya_sets, 0), 0),
    greatest(coalesce(p_samosas, 0), 0),
    greatest(coalesce(p_kachoris, 0), 0),
    greatest(coalesce(p_teas, 0), 0),
    greatest(coalesce(p_jalebis, 0), 0),
    true,
    true,
    nullif(trim(coalesce(p_comments, '')), '')
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'ALREADY_REGISTERED';
end;
$$;

grant execute on function public.register_attendee(
  uuid, text, text, text, integer, integer, integer, integer, integer, integer, integer, boolean, boolean, text
) to anon, authenticated;

alter table public.admin_emails enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;

drop policy if exists "admins read admin_emails" on public.admin_emails;
drop policy if exists "users read own admin email" on public.admin_emails;
create policy "users read own admin email"
  on public.admin_emails for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "public read published events" on public.events;
create policy "public read published events"
  on public.events for select
  to anon, authenticated
  using (is_published = true or public.is_admin());

drop policy if exists "admins insert events" on public.events;
create policy "admins insert events"
  on public.events for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "admins update events" on public.events;
create policy "admins update events"
  on public.events for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins delete events" on public.events;
create policy "admins delete events"
  on public.events for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "public insert registrations for published" on public.registrations;
create policy "public insert registrations for published"
  on public.registrations for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.is_published = true
    )
  );

drop policy if exists "admins read registrations" on public.registrations;
create policy "admins read registrations"
  on public.registrations for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins delete registrations" on public.registrations;
create policy "admins delete registrations"
  on public.registrations for delete
  to authenticated
  using (public.is_admin());

-- Seed first organizer (locked decision). Add more organizers the same way.
insert into public.admin_emails (email)
values ('treasurer@bssb.cz')
on conflict (email) do nothing;

-- Additional organizers (optional):
-- insert into public.admin_emails (email) values ('another@bssb.cz')
-- on conflict (email) do nothing;
