-- Event timezone (wall-clock for organizers) + donation/payment QR image.
-- Delete is already allowed via RLS "admins delete events"; registrations cascade.

alter table public.events
  add column if not exists timezone text not null default 'Europe/Prague';

alter table public.events
  add column if not exists donation_image_url text;

comment on column public.events.timezone is
  'IANA timezone for starts_at/ends_at wall clock (default Europe/Prague for BSSB Brno).';

comment on column public.events.donation_image_url is
  'Optional public URL for donation/payment QR image (Storage event-posters).';

-- Keep existing rows on Prague unless already set
update public.events
set timezone = 'Europe/Prague'
where timezone is null or trim(timezone) = '';
