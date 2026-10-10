-- Roles: admin (site + organizers) vs organizer (events only).
-- Seed treasurer@bssb.cz as the sole site admin.

alter table public.admin_emails
  add column if not exists role text not null default 'organizer'
  check (role in ('admin', 'organizer'));

-- Existing allowlisted emails stay organizers; elevate treasurer.
update public.admin_emails
set role = 'admin'
where lower(email) = 'treasurer@bssb.cz';

insert into public.admin_emails (email, role)
values ('treasurer@bssb.cz', 'admin')
on conflict (email) do update
set role = 'admin';

-- is_admin(): any allowlisted email (admin or organizer) — event management.
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

-- is_site_admin(): role = admin — site content + allowlist management.
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

-- Site homepage content (single row id = 'home').
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

insert into public.site_content (id)
values ('home')
on conflict (id) do nothing;

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

-- Allowlist management: site admins read all; everyone still reads own row.
drop policy if exists "users read own admin email" on public.admin_emails;
drop policy if exists "admins read admin_emails" on public.admin_emails;
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

-- Block deleting the last site admin (defense in depth).
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
