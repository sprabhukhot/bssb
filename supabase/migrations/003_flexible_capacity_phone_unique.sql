-- Migration: flexible capacity / party maxes + phone-per-event unique key
-- Run after 002_navratri_form_fields.sql on existing projects.

-- Per-event party limits (null = unlimited / app safety ceiling)
alter table public.events
  add column if not exists max_adults integer
    check (max_adults is null or max_adults >= 1),
  add column if not exists max_children integer
    check (max_children is null or max_children >= 0);

-- Backfill Navratri-sensible defaults where null
update public.events set max_adults = 10 where max_adults is null;
update public.events set max_children = 5 where max_children is null;

-- Email optional; phone becomes the dedupe key
alter table public.registrations alter column email drop not null;

-- Drop old email unique if present
alter table public.registrations drop constraint if exists registrations_event_id_email_key;

-- Normalize existing phones before adding unique
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

update public.registrations
set phone = public.normalize_phone(phone)
where phone is distinct from public.normalize_phone(phone);

-- Soften hard 1-10 / 0-5 checks: drop old check constraints if named generically
-- (Postgres auto-names checks; recreate adults/children as >= only)
do $$
declare
  r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'registrations'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%adults_count%'
  loop
    execute format('alter table public.registrations drop constraint %I', r.conname);
  end loop;
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'registrations'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%children_count%'
  loop
    execute format('alter table public.registrations drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.registrations
  add constraint registrations_adults_count_check check (adults_count >= 1),
  add constraint registrations_children_count_check check (children_count >= 0);

-- Unique phone per event (after normalize). Fail if duplicate phones exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'registrations_event_id_phone_key'
  ) then
    alter table public.registrations
      add constraint registrations_event_id_phone_key unique (event_id, phone);
  end if;
end $$;

grant execute on function public.normalize_phone(text) to anon, authenticated;

-- Replace register_attendee with flexible validation + phone unique
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
