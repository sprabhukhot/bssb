# BSSB Event Registration

GitHub repo: https://github.com/sprabhukhot/bssb.git

Standalone events site for **Bhartiya Sanskritik Sangh, Brno** ([bssb.cz](https://bssb.cz/)): community gatherings with guest registration links and a quiet volunteer sign-in for managing events.

**Dual UI:** org landing + volunteer tools (`/`, `/login`, `/admin`) vs guest form (`/e/[slug]` only — no volunteer chrome).

Stack: **Next.js** + **Supabase** (free) → **Netlify** (free). Deploy as a **standalone** Netlify site alongside the main bssb.cz site.

**Roles** (same Organizer sign-in): **`treasurer@bssb.cz`** is the sole **site admin** (homepage content + add organizers). Other `admin_emails` rows are **organizers** (events only). See Project store doc `docs/admin-and-content.md`.

## Quick start

1. Create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL Editor (or apply migrations through `008_image_captions_choice_fields.sql`). Ensure Storage bucket `event-posters` is public (migration or Dashboard — see [`docs/event-form-builder.md`](./docs/event-form-builder.md)).
2. Copy `.env.example` → `.env.local` and fill values.
3. Configure Supabase Auth Site URL + redirect `{SITE_URL}/auth/callback`. Create organizer users with email + password (Auto Confirm) under Auth → Users — password is the primary `/login` method (see `docs/netlify-go-live.md`). Production: `https://events.bssb.cz`.
4. `npm install && npm run dev`

Full NGO-facing setup (accounts, Netlify deploy, env vars) is in the Project plan / go-live docs:

`docs/event-registration-plan.md` · `docs/netlify-go-live.md`

## Deploy (Netlify)

1. Push this folder to a GitHub repo.
2. Netlify → **Add new site** → Import from Git → select the repo.
3. Build settings come from [`netlify.toml`](./netlify.toml) (`npm run build` + `@netlify/plugin-nextjs`).
4. Site settings → **Environment variables** (Production):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   NEXT_PUBLIC_SITE_URL=https://events.bssb.cz
   ```

5. Deploy. Then set Supabase Auth **Site URL** = `https://events.bssb.cz` and **Redirect URLs** = `https://events.bssb.cz/auth/callback` (plus localhost for local). Never leave Site URL / `NEXT_PUBLIC_SITE_URL` on localhost in production.
6. Later: from the existing bssb.cz Netlify site, add a nav link or redirect (e.g. `/events` → https://events.bssb.cz). Keep this app as its own Netlify site unless you intentionally merge sites.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — Typecheck (`tsc --noEmit`)

## App routes

| Path | Who | Purpose |
|------|-----|---------|
| `/` | Public | BSSB community events home (from `site_content` + fallbacks) |
| `/login` | Staff | Email + password sign-in (magic link optional) |
| `/admin` | Admin + organizer | Event list |
| `/admin/analytics` | Admin + organizer | Annual registration totals |
| `/admin/site` | Admin only | Edit homepage content |
| `/admin/organizers` | Admin only | Add/remove allowlisted emails |
| `/admin/events/new` | Admin + organizer | Create event, form builder, poster |
| `/admin/events/[id]` | Admin + organizer | Edit form/poster, analytics, entry detail, exports |
| `/admin/events/[id]/export` | Admin + organizer | CSV download |
| `/admin/events/[id]/export.xlsx` | Admin + organizer | Excel (.xlsx) download |
| `/e/[slug]` | Participants | Registration form (share link only) |
| `/e/[slug]/thanks` | Participants | Confirmation |
| `/preview/register` | Demo | Participant UI without Supabase |
| `/preview/admin` | Demo | Organizer dashboard without Supabase |
