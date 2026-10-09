-- Migration: Navratri Google Form field parity
-- Run in Supabase SQL Editor after the base schema.sql (or on existing projects).

alter table public.registrations
  add column if not exists adults_count integer not null default 1
    check (adults_count >= 1 and adults_count <= 10),
  add column if not exists children_count integer not null default 0
    check (children_count >= 0 and children_count <= 5),
  add column if not exists dandiya_sets integer not null default 0
    check (dandiya_sets >= 0 and dandiya_sets <= 5),
  add column if not exists samosas integer not null default 0
    check (samosas >= 0 and samosas <= 5),
  add column if not exists kachoris integer not null default 0
    check (kachoris >= 0 and kachoris <= 5),
  add column if not exists teas integer not null default 0
    check (teas >= 0 and teas <= 5),
  add column if not exists jalebis integer not null default 0
    check (jalebis >= 0 and jalebis <= 5),
  add column if not exists payment_acknowledged boolean not null default false,
  add column if not exists data_consent boolean not null default false,
  add column if not exists comments text;

-- Headcount = adults + children (matches family-style Google Form capacity)
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

drop function if exists public.register_attendee(uuid, text, text, text);

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
  v_id uuid;
begin
  if p_payment_acknowledged is not true then
    raise exception 'PAYMENT_ACK_REQUIRED';
  end if;
  if p_data_consent is not true then
    raise exception 'CONSENT_REQUIRED';
  end if;
  if p_phone is null or length(trim(p_phone)) = 0 then
    raise exception 'PHONE_REQUIRED';
  end if;
  if p_adults_count is null or p_adults_count < 1 or p_adults_count > 10 then
    raise exception 'INVALID_ADULTS';
  end if;
  if p_children_count is null or p_children_count < 0 or p_children_count > 5 then
    raise exception 'INVALID_CHILDREN';
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found or v_event.is_published is not true then
    raise exception 'EVENT_CLOSED';
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
    lower(trim(p_email)),
    trim(p_phone),
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
