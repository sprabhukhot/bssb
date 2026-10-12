/**
 * Browser-safe Supabase credentials.
 * Accepts either the classic env name (ANON_KEY) or the new publishable name.
 * Value may be a legacy JWT anon key or an `sb_publishable_…` key — both work
 * with @supabase/supabase-js v2.117+.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable key). Copy .env.example to .env.local.",
    );
  }
  return { url, anonKey };
}

/**
 * Public site origin for magic-link redirects and absolute share URLs.
 * Always prefer NEXT_PUBLIC_SITE_URL. Never fall back to localhost in production
 * (that sends auth emails to http://localhost:3000 and breaks login).
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) {
    if (
      process.env.NODE_ENV === "production" &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configured)
    ) {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL is set to localhost in production. Set it to https://events.bssb.cz in Netlify and redeploy.",
      );
    }
    return configured;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing NEXT_PUBLIC_SITE_URL. Set it to https://events.bssb.cz in Netlify environment variables and redeploy.",
    );
  }
  return "http://localhost:3000";
}
