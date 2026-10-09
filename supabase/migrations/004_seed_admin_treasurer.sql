-- First organizer allowlist entry (locked decision).
insert into public.admin_emails (email)
values ('treasurer@bssb.cz')
on conflict (email) do nothing;
