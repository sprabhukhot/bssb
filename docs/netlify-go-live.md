# BSSB Events — Netlify go-live checklist

GitHub repo: https://github.com/sprabhukhot/bssb.git  
App is on `main` at repo root (ready to import).  
Supabase project: `https://nberqbgaqukcepskvbmb.supabase.co`  
Production site: **https://events.bssb.cz**  
First organizer / site admin: **treasurer@bssb.cz**  
Host: **Netlify** (standalone site; keep bssb.cz’s existing Netlify site separate)

> App code expects env name **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**. Paste the new-format publishable key (`sb_publishable_…`) as that value — confirmed working with `@supabase/supabase-js` v2.117. (Optional alias: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.)

---

## Organizer sign-in (password — no SMTP required)

Magic-link templates on the free Supabase mailer are locked (“Set up custom SMTP to edit templates”). **Primary sign-in is email + password** on https://events.bssb.cz/login. Allowlist is still `admin_emails` (treasurer remains `role = admin` after login).

### Exact Email provider toggles (required for password login)

In **Supabase Dashboard** for project `nberqbgaqukcepskvbmb`:

1. Open **Authentication → Providers → Email**
2. **Enable Email provider** = **ON** (this enables email + password; magic link alone is not enough)
3. **Confirm email** = **OFF**  
   (If ON, users must be Confirmed in Auth → Users or password login returns “email not confirmed”. Auto Confirm on user create only helps for newly created users while Confirm email is ON.)
4. Save

Also verify **Authentication → URL configuration**:

| Setting | Value |
|---------|--------|
| Site URL | `https://events.bssb.cz` |
| Redirect URLs | `https://events.bssb.cz/auth/callback` **and** `https://events.bssb.cz/auth/reset` (+ localhost equivalents for dev) |

### Password reset / recovery email

App routes:

- `/login` → **Forgot password?** → `resetPasswordForEmail` with `redirectTo=https://events.bssb.cz/auth/reset`
- `/auth/reset` — set new password (handles `token_hash`, PKCE `code`, and `#access_token…&type=recovery` hash)
- Homepage `/` — if a recovery hash lands on Site URL, client redirects to `/auth/reset#…`
- `/auth/callback` — if `type=recovery`, verifies then redirects to `/auth/reset`

**Ideal Recovery template** (needs custom SMTP to edit; otherwise leave default):

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset
```

**Without SMTP (templates locked):** use Forgot password on `/login`. Default ConfirmationURL may open the homepage with a `#access_token…&type=recovery` hash — the app forwards that to `/auth/reset`. Still add Redirect URLs above.

**Most reliable without email:** Supabase → Authentication → Users → delete `treasurer@bssb.cz` → Add user with password + **Auto Confirm** → sign in at `/login`.

### Set the first password for treasurer@bssb.cz

In **Supabase Dashboard → Authentication → Users** (no SMTP needed):

**If the user does not exist yet**

1. **Add user** → **Create new user**
2. Email: `treasurer@bssb.cz`
3. Choose a strong password (save it in the org password manager)
4. Enable **Auto Confirm User** (so no confirmation email is required)
5. Create user

**If the user already exists** (e.g. from earlier magic-link attempts)

1. Open the `treasurer@bssb.cz` row
2. Set / update the password in the user details panel (or delete the user and recreate with Auto Confirm + password as above)
3. Ensure the email shows as **Confirmed**

Then confirm allowlist (SQL Editor if needed):

```sql
select email, role from public.admin_emails where email = 'treasurer@bssb.cz';
-- expect role = admin
```

Sign in at https://events.bssb.cz/login with that email + password.

### Add another organizer later

1. Create Authed user the same way (email + password + Auto Confirm), **or** have a site admin add their email under **Organizers** after login
2. They must exist in `admin_emails` (role `organizer` or `admin`) or login succeeds then is rejected by the allowlist check

---

## Exact Auth URL settings for https://events.bssb.cz

Still set these (share links / optional magic link / redirects):

| # | Where | Setting | Value |
|---|--------|---------|--------|
| 1 | **Netlify** → Environment variables → Production | `NEXT_PUBLIC_SITE_URL` | `https://events.bssb.cz` |
| 2 | **Supabase** → Authentication → URL configuration | **Site URL** | `https://events.bssb.cz` |
| 3 | **Supabase** → Authentication → URL configuration | **Redirect URLs** | `https://events.bssb.cz/auth/callback` and `https://events.bssb.cz/auth/reset` |

Also keep for local: `http://localhost:3000/auth/callback`.

After changing `NEXT_PUBLIC_SITE_URL`, **redeploy** Netlify.

### Optional later: magic links (needs custom SMTP)

Default mailer cannot edit Magic Link templates. If you want reliable magic links later:

1. Set up free SMTP (e.g. **Resend**) under Supabase → Project Settings → Authentication → SMTP
2. Then customize Magic link to `token_hash` → `/auth/confirm` and include `{{ .Token }}` (see older notes / app `/auth/confirm`)
3. Until then, leave magic link collapsed on `/login` and use **password**

---

## 1) Supabase (once)

1. SQL Editor → run `supabase/schema.sql` (or migration `005_admin_role_site_content.sql` on existing DBs). Seeds `treasurer@bssb.cz` as **admin** in `admin_emails`.
2. Auth → Providers → Email → enable Email (password). Magic link can stay enabled but is secondary.
3. Auth → URL configuration — values in the table above.
4. Auth → Users — create/set password for `treasurer@bssb.cz` as above.

## 2) Push / import GitHub

1. Ensure https://github.com/sprabhukhot/bssb.git has the app at repo root (including password login).
2. Netlify → Import **sprabhukhot/bssb** as its own site (do not overwrite bssb.cz).
3. Build via `netlify.toml`. Domain: **events.bssb.cz**.

## 3) Netlify environment variables (Production)

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nberqbgaqukcepskvbmb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(publishable key — do not commit)* |
| `NEXT_PUBLIC_SITE_URL` | `https://events.bssb.cz` |
| `RESEND_API_KEY` | Resend API key (registration confirmations; skip send if unset) |
| `RESEND_FROM` | optional. Default `BSSB Events <beth.t@example.com>`. Custom From needs a verified Resend domain. |

## 4) Deploy and smoke-test

1. Deploy / redeploy after the password-login commit lands.
2. https://events.bssb.cz/login → organizer email + password → Events (and Site content / Organizers if site admin).
3. Create → publish → **Copy link** → test `/e/…`.

### Troubleshooting (login errors are now distinct)

After the auth error-mapping fix, `/login` no longer maps every failure to “wrong password”.

| Message you see | Meaning / fix |
|-----------------|---------------|
| Wrong email or password (…Auth rejected this pair) | True `invalid_credentials`. Reset password in Auth → Users; confirm Providers → Email is enabled |
| Email not confirmed | Confirm the user in Auth → Users, **or** set Providers → Email → **Confirm email = OFF** |
| Email/password sign-in is disabled | Providers → Email → **Enable Email provider = ON** |
| Signed in… not on the organizer allowlist | Auth OK; add email to `admin_emails` |
| Allowlist check failed | RLS/DB issue on `admin_emails` |
| Could not reach Supabase / env misconfigured | Netlify: `NEXT_PUBLIC_SUPABASE_URL` = `https://nberqbgaqukcepskvbmb.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` = publishable/anon key, then **redeploy** |
| Magic link / OTP still failing | Expected without custom SMTP — use password |
| Rate limit | Wait; use password only |

## 5) Later (optional)

Link bssb.cz → https://events.bssb.cz. Add Resend SMTP only if you want magic links.
