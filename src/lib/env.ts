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
