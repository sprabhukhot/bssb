-- BSSB Event Registration — Supabase schema (run once in SQL Editor)
-- Capacity optional; party maxes admin-configurable; unique key = phone per event.

create extension if not exists "pgcrypto";

create table if not exists public.admin_emails (
  email text primary key,
  role text not null default 'organizer' check (role in ('admin', 'organizer')),
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
  -- Per-event registration field schema (JSON array). App default: name + phone + email.
  form_fields jsonb not null default '[
    {"id":"full_name","type":"short_text","label":"Your name","required":true},
    {"id":"phone","type":"phone","label":"Contact number","required":true,"helpText":"Required — one registration per phone."},
    {"id":"email","type":"email","label":"Email","required":false,"helpText":"Optional"}
  ]'::jsonb,
  poster_url text,
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
  answers jsonb not null default '{}'::jsonb,
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

-- Site admin (role = admin): homepage content + organizer allowlist.
create or replace function public.is_site_admin()
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
      and a.role = 'admin'
  );
$$;

grant execute on function public.is_site_admin() to authenticated;

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
  select coalesce(sum(
    case
      when coalesce((r.answers ->> 'adults_count')::int, 0)
         + coalesce((r.answers ->> 'children_count')::int, 0) > 0
        then coalesce((r.answers ->> 'adults_count')::int, 0)
           + coalesce((r.answers ->> 'children_count')::int, 0)
      when coalesce(r.adults_count, 0) + coalesce(r.children_count, 0) > 0
        then coalesce(r.adults_count, 0) + coalesce(r.children_count, 0)
      else 1
    end
  ), 0)::integer
  from public.registrations r
  where r.event_id = p_event_id;
$$;

grant execute on function public.event_registration_count(uuid) to anon, authenticated;
grant execute on function public.normalize_phone(text) to anon, authenticated;

drop function if exists public.register_attendee(
  uuid, text, text, text, integer, integer, integer, integer, integer, integer, integer, boolean, boolean, text
);

create or replace function public.register_attendee(
  p_event_id uuid,
  p_answers jsonb
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
  v_name text;
  v_id uuid;
  v_adults integer;
  v_children integer;
  v_field jsonb;
  v_fid text;
  v_ftype text;
  v_required boolean;
  v_label text;
  v_raw text;
  v_num numeric;
  v_opts jsonb;
begin
  select * into v_event from public.events where id = p_event_id;
  if not found or v_event.is_published is not true then
    raise exception 'EVENT_CLOSED';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'INVALID_ANSWERS';
  end if;

  -- Validate each configured field
  for v_field in
    select value from jsonb_array_elements(coalesce(v_event.form_fields, '[]'::jsonb))
  loop
    v_fid := v_field ->> 'id';
    v_ftype := v_field ->> 'type';
    v_required := coalesce((v_field ->> 'required')::boolean, false);
    v_label := coalesce(v_field ->> 'label', v_fid);
    v_raw := p_answers ->> v_fid;

    if v_ftype = 'checkbox' then
      if v_required and coalesce((p_answers ->> v_fid)::boolean, false) is not true
         and lower(coalesce(v_raw, '')) not in ('true', 'on', 'yes', '1') then
        raise exception 'FIELD_REQUIRED:%', v_label;
      end if;
      continue;
    end if;

    if v_required and (v_raw is null or trim(v_raw) = '') then
      raise exception 'FIELD_REQUIRED:%', v_label;
    end if;

    if v_raw is null or trim(v_raw) = '' then
      continue;
    end if;

    if v_ftype = 'email' and v_raw !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'INVALID_EMAIL';
    end if;

    if v_ftype = 'number' then
      begin
        v_num := trim(v_raw)::numeric;
      exception when others then
        raise exception 'INVALID_NUMBER:%', v_label;
      end;
      if (v_field ? 'min') and v_num < (v_field ->> 'min')::numeric then
        raise exception 'INVALID_NUMBER:%', v_label;
      end if;
      if (v_field ? 'max') and v_num > (v_field ->> 'max')::numeric then
        raise exception 'INVALID_NUMBER:%', v_label;
      end if;
    end if;

    if v_ftype = 'dropdown' then
      v_opts := coalesce(v_field -> 'options', '[]'::jsonb);
      if jsonb_typeof(v_opts) = 'array'
         and not exists (
           select 1 from jsonb_array_elements_text(v_opts) o where o = v_raw
         ) then
        raise exception 'INVALID_OPTION:%', v_label;
      end if;
    end if;
  end loop;

  v_phone := public.normalize_phone(coalesce(p_answers ->> 'phone', ''));
  if v_phone is null then
    -- first phone-typed field
    select public.normalize_phone(p_answers ->> (f ->> 'id'))
      into v_phone
    from jsonb_array_elements(coalesce(v_event.form_fields, '[]'::jsonb)) f
    where f ->> 'type' = 'phone'
    limit 1;
  end if;
  if v_phone is null then
    raise exception 'PHONE_REQUIRED';
  end if;

  v_name := nullif(trim(coalesce(p_answers ->> 'full_name', '')), '');
  if v_name is null then
    select nullif(trim(p_answers ->> (f ->> 'id')), '')
      into v_name
    from jsonb_array_elements(coalesce(v_event.form_fields, '[]'::jsonb)) f
    where f ->> 'type' = 'short_text'
    limit 1;
  end if;
  if v_name is null then
    raise exception 'NAME_REQUIRED';
  end if;

  v_email := nullif(lower(trim(coalesce(p_answers ->> 'email', ''))), '');

  v_adults := coalesce((p_answers ->> 'adults_count')::int, 1);
  v_children := coalesce((p_answers ->> 'children_count')::int, 0);
  if v_adults < 0 then v_adults := 0; end if;
  if v_children < 0 then v_children := 0; end if;

  v_party := case
    when coalesce((p_answers ->> 'adults_count')::int, 0)
       + coalesce((p_answers ->> 'children_count')::int, 0) > 0
      then coalesce((p_answers ->> 'adults_count')::int, 0)
         + coalesce((p_answers ->> 'children_count')::int, 0)
    else 1
  end;

  select public.event_registration_count(p_event_id) into v_count;
  if v_event.capacity is not null and (v_count + v_party) > v_event.capacity then
    raise exception 'EVENT_FULL';
  end if;

  insert into public.registrations (
    event_id, full_name, email, phone,
    adults_count, children_count,
    dandiya_sets, samosas, kachoris, teas, jalebis,
    payment_acknowledged, data_consent, comments, answers
  )
  values (
    p_event_id,
    v_name,
    v_email,
    v_phone,
    greatest(v_adults, 1),
    greatest(v_children, 0),
    greatest(coalesce((p_answers ->> 'dandiya_sets')::int, 0), 0),
    greatest(coalesce((p_answers ->> 'samosas')::int, 0), 0),
    greatest(coalesce((p_answers ->> 'kachoris')::int, 0), 0),
    greatest(coalesce((p_answers ->> 'teas')::int, 0), 0),
    greatest(coalesce((p_answers ->> 'jalebis')::int, 0), 0),
    coalesce((p_answers ->> 'payment_acknowledged')::boolean, false)
      or lower(coalesce(p_answers ->> 'payment_acknowledged', '')) in ('true','on','yes','1'),
    coalesce((p_answers ->> 'data_consent')::boolean, false)
      or lower(coalesce(p_answers ->> 'data_consent', '')) in ('true','on','yes','1'),
    nullif(trim(coalesce(p_answers ->> 'comments', '')), ''),
    p_answers
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'ALREADY_REGISTERED';
end;
$$;

grant execute on function public.register_attendee(uuid, jsonb) to anon, authenticated;



alter table public.admin_emails enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;

drop policy if exists "admins read admin_emails" on public.admin_emails;
drop policy if exists "users read own admin email" on public.admin_emails;
drop policy if exists "staff read own or site admin read all" on public.admin_emails;
create policy "staff read own or site admin read all"
  on public.admin_emails for select
  to authenticated
  using (
    public.is_site_admin()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "site admins insert admin_emails" on public.admin_emails;
create policy "site admins insert admin_emails"
  on public.admin_emails for insert
  to authenticated
  with check (public.is_site_admin());

drop policy if exists "site admins update admin_emails" on public.admin_emails;
create policy "site admins update admin_emails"
  on public.admin_emails for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

drop policy if exists "site admins delete admin_emails" on public.admin_emails;
create policy "site admins delete admin_emails"
  on public.admin_emails for delete
  to authenticated
  using (public.is_site_admin());

create or replace function public.prevent_last_site_admin_delete()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'admin' then
    if (
      select count(*)::integer
      from public.admin_emails
      where role = 'admin' and lower(email) <> lower(old.email)
    ) = 0 then
      raise exception 'CANNOT_REMOVE_LAST_ADMIN';
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists admin_emails_prevent_last_admin on public.admin_emails;
create trigger admin_emails_prevent_last_admin
before delete on public.admin_emails
for each row execute function public.prevent_last_site_admin_delete();

create or replace function public.prevent_last_site_admin_demote()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'admin' and new.role is distinct from 'admin' then
    if (
      select count(*)::integer
      from public.admin_emails
      where role = 'admin' and lower(email) <> lower(old.email)
    ) = 0 then
      raise exception 'CANNOT_DEMOTE_LAST_ADMIN';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists admin_emails_prevent_last_admin_demote on public.admin_emails;
create trigger admin_emails_prevent_last_admin_demote
before update on public.admin_emails
for each row execute function public.prevent_last_site_admin_demote();

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

-- Site homepage content
create table if not exists public.site_content (
  id text primary key default 'home' check (id = 'home'),
  subtitle text not null default 'Preserving & Celebrating Culture',
  hero_headline text not null default 'Bhartiya Sanskritik Sangh, Brno',
  hero_body text not null default 'Music, dance, language, and festivals—community gatherings where we meet, celebrate, and welcome families in Brno.',
  about_title text not null default 'Events with BSSB',
  about_body text not null default 'From Navratri and cultural evenings to seva and langar, BSSB brings people together. Volunteers publish each gathering with a simple registration link for guests—no accounts required for attendees.',
  pillar_1_title text not null default 'Gather',
  pillar_1_body text not null default 'Set the date, place, and welcome for your event',
  pillar_2_title text not null default 'Invite',
  pillar_2_body text not null default 'Share one link with friends, WhatsApp groups, and posters',
  pillar_3_title text not null default 'Celebrate',
  pillar_3_body text not null default 'See who is coming and keep the community close',
  footer_text text not null default '© Bhartiya Sanskritik Sangh, Brno',
  updated_at timestamptz not null default now()
);

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
before update on public.site_content
for each row execute function public.set_updated_at();

insert into public.site_content (id) values ('home') on conflict (id) do nothing;

alter table public.site_content enable row level security;

drop policy if exists "public read site_content" on public.site_content;
create policy "public read site_content"
  on public.site_content for select
  to anon, authenticated
  using (true);

drop policy if exists "site admins update site_content" on public.site_content;
create policy "site admins update site_content"
  on public.site_content for update
  to authenticated
  using (public.is_site_admin())
  with check (public.is_site_admin());

drop policy if exists "site admins insert site_content" on public.site_content;
create policy "site admins insert site_content"
  on public.site_content for insert
  to authenticated
  with check (public.is_site_admin());

-- Seed sole site admin (locked decision). Extra organizers get role = organizer.
insert into public.admin_emails (email, role)
values ('treasurer@bssb.cz', 'admin')
on conflict (email) do update set role = 'admin';

-- Additional organizers (optional):
-- insert into public.admin_emails (email, role) values ('another@bssb.cz', 'organizer')
-- on conflict (email) do nothing;


-- Storage: public bucket event-posters (2MB, jpg/png/webp). Prefer running
-- supabase/migrations/006_custom_form_fields_and_posters.sql which creates the
-- bucket + RLS policies. Dashboard fallback: Storage → New bucket → event-posters → Public.
