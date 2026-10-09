# BSSB Event Registration

GitHub repo: https://github.com/sprabhukhot/bssb.git

Standalone events site for **Bhartiya Sanskritik Sangh, Brno** ([bssb.cz](https://bssb.cz/)): community gatherings with guest registration links and a quiet volunteer sign-in for managing events.

**Dual UI:** org landing + volunteer tools (`/`, `/login`, `/admin`) vs guest form (`/e/[slug]` only — no volunteer chrome).

Stack: **Next.js** + **Supabase** (free) → **Netlify** (free). Deploy as a **standalone** Netlify site alongside the main bssb.cz site.

First organizer allowlist email: **`treasurer@bssb.cz`** (seeded in `supabase/schema.sql`).

## Quick start

1. Create a Supabase project and run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL Editor (seeds `treasurer@bssb.cz`).
2. Copy `.env.example` → `.env.local` and fill values.
3. Configure Supabase Auth redirect URL: `{SITE_URL}/auth/callback`.
4. `npm install && npm run dev`

Full NGO-facing setup (accounts, Netlify deploy, env vars) is in the Project plan:

`docs/event-registration-plan.md`

## Deploy (Netlify)

1. Push this folder to a GitHub repo.
2. Netlify → **Add new site** → Import from Git → select the repo.
3. Build settings come from [`netlify.toml`](./netlify.toml) (`npm run build` + `@netlify/plugin-nextjs`).
4. Site settings → **Environment variables** (Production):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   NEXT_PUBLIC_SITE_URL=https://YOUR-SITE.netlify.app
   ```

5. Deploy. Then set Supabase Auth **Site URL** + **Redirect URLs** to that Netlify URL (`…/auth/callback`).
6. Later: from the existing bssb.cz Netlify site, add a nav link or redirect (e.g. `/events` → this app). Keep this app as its own Netlify site unless you intentionally merge sites.

No production URL is claimed until you complete the Netlify + Supabase steps above.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — Typecheck (`tsc --noEmit`)

## App routes

| Path | Who | Purpose |
|------|-----|---------|
| `/` | Public | BSSB community events home |
| `/login` | Volunteers | Magic-link sign-in |
| `/admin` | Volunteers | Event list |
| `/admin/events/new` | Organizers | Create event |
| `/admin/events/[id]` | Organizers | Edit, attendees, duplicate, CSV |
| `/admin/events/[id]/export` | Organizers | CSV download |
| `/e/[slug]` | Participants | Registration form (share link only) |
| `/e/[slug]/thanks` | Participants | Confirmation |
| `/preview/register` | Demo | Participant UI without Supabase |
| `/preview/admin` | Demo | Organizer dashboard without Supabase |
