-- Caption/heading/body text beside poster + donation images.
-- Choice/image option shapes live in events.form_fields JSON (no new tables).

alter table public.events
  add column if not exists poster_heading text not null default '';

alter table public.events
  add column if not exists poster_body text not null default '';

alter table public.events
  add column if not exists donation_heading text not null default '';

alter table public.events
  add column if not exists donation_body text not null default '';

comment on column public.events.poster_heading is
  'Optional heading shown with the event poster on the public page.';
comment on column public.events.poster_body is
  'Optional body text shown with the event poster.';
comment on column public.events.donation_heading is
  'Optional heading shown with the donation/payment image.';
comment on column public.events.donation_body is
  'Optional body text shown with the donation/payment image.';

-- Allow multi_choice arrays + choice-id validation on register_attendee
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

    -- Multi-select: value is a JSON array of choice ids
    if v_ftype = 'multi_choice' then
      if jsonb_typeof(p_answers -> v_fid) = 'array' then
        if v_required and jsonb_array_length(p_answers -> v_fid) = 0 then
          raise exception 'FIELD_REQUIRED:%', v_label;
        end if;
      elsif v_required then
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

    -- Choice fields: accept choice id, choice label, or legacy options[] string
    if v_ftype in ('dropdown', 'single_choice', 'image_choice') then
      if not (
        exists (
          select 1
          from jsonb_array_elements(coalesce(v_field -> 'choices', '[]'::jsonb)) c
          where c ->> 'id' = v_raw or c ->> 'label' = v_raw
        )
        or exists (
          select 1
          from jsonb_array_elements_text(coalesce(v_field -> 'options', '[]'::jsonb)) o
          where o = v_raw
        )
      ) then
        -- Only enforce when options/choices are present
        v_opts := coalesce(v_field -> 'choices', v_field -> 'options', '[]'::jsonb);
        if jsonb_typeof(v_opts) = 'array' and jsonb_array_length(v_opts) > 0 then
          raise exception 'INVALID_OPTION:%', v_label;
        end if;
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
