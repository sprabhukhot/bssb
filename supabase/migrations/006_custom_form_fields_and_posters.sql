-- Per-event registration form schema + poster URL + answers JSON.
-- Also documents Storage bucket event-posters (create in Dashboard if SQL blocked).

-- 1) Event form definition + poster
alter table public.events
  add column if not exists form_fields jsonb not null default '[]'::jsonb;

alter table public.events
  add column if not exists poster_url text;

-- 2) Registration answers (flexible key/value per form field id)
alter table public.registrations
  add column if not exists answers jsonb not null default '{}'::jsonb;

-- Soften legacy column constraints so custom forms need not send Navratri qtys.
-- Keep columns for backward compatibility / CSV fallbacks.
alter table public.registrations
  alter column adults_count set default 1;
alter table public.registrations
  alter column children_count set default 0;

-- 3) Backfill answers from legacy columns
update public.registrations
set answers = jsonb_strip_nulls(
  jsonb_build_object(
    'full_name', full_name,
    'email', email,
    'phone', phone,
    'adults_count', adults_count,
    'children_count', children_count,
    'dandiya_sets', dandiya_sets,
    'samosas', samosas,
    'kachoris', kachoris,
    'teas', teas,
    'jalebis', jalebis,
    'comments', comments,
    'payment_acknowledged', payment_acknowledged,
    'data_consent', data_consent
  )
)
where answers = '{}'::jsonb
   or answers is null;

-- 4) Existing events: preserve Navratri-shaped forms; new events use app default.
update public.events
set form_fields = $json$[
  {"id":"full_name","type":"short_text","label":"Your name","required":true},
  {"id":"phone","type":"phone","label":"Contact number","required":true,"helpText":"Required — one registration per phone."},
  {"id":"email","type":"email","label":"Email","required":false,"helpText":"Optional"},
  {"id":"adults_count","type":"number","label":"Adults (over 10 years)","required":true,"min":1,"max":10},
  {"id":"children_count","type":"number","label":"Children (under 10)","required":true,"min":0,"max":5},
  {"id":"dandiya_sets","type":"number","label":"Dandiya sets","required":true,"min":0,"max":50},
  {"id":"samosas","type":"number","label":"Samosas","required":true,"min":0,"max":50},
  {"id":"kachoris","type":"number","label":"Kachoris","required":true,"min":0,"max":50},
  {"id":"teas","type":"number","label":"Tea / chai","required":true,"min":0,"max":50},
  {"id":"jalebis","type":"number","label":"Jalebi plates","required":true,"min":0,"max":50},
  {"id":"comments","type":"long_text","label":"Comments","required":false},
  {"id":"payment_acknowledged","type":"checkbox","label":"I understand registration is valid only after payment is received.","required":true},
  {"id":"data_consent","type":"checkbox","label":"I consent to BSSB processing my personal data for this and related event communication.","required":true}
]$json$::jsonb
where form_fields = '[]'::jsonb
   or form_fields is null;

-- Default for brand-new events created outside the app (name + phone + email).
alter table public.events
  alter column form_fields set default $json$[
    {"id":"full_name","type":"short_text","label":"Your name","required":true},
    {"id":"phone","type":"phone","label":"Contact number","required":true,"helpText":"Required — one registration per phone."},
    {"id":"email","type":"email","label":"Email","required":false,"helpText":"Optional"}
  ]$json$::jsonb;

-- 5) Capacity count: prefer adults+children from answers/columns; else 1 per form
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

-- 6) Flexible register_attendee(answers jsonb)
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

-- 7) Storage bucket for posters (may require Dashboard if storage schema restricted)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-posters',
  'event-posters',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read event posters" on storage.objects;
create policy "Public read event posters"
  on storage.objects for select
  using (bucket_id = 'event-posters');

drop policy if exists "Staff upload event posters" on storage.objects;
create policy "Staff upload event posters"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-posters' and public.is_admin());

drop policy if exists "Staff update event posters" on storage.objects;
create policy "Staff update event posters"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'event-posters' and public.is_admin())
  with check (bucket_id = 'event-posters' and public.is_admin());

drop policy if exists "Staff delete event posters" on storage.objects;
create policy "Staff delete event posters"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-posters' and public.is_admin());
