"use server";

import { redirect } from "next/navigation";
import { publicAuthError } from "@/lib/auth-errors";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function safeNextPath(raw: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/admin";
  return raw;
}

async function assertAllowlisted(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("admin_emails")
    .select("email")
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    console.info("[auth] allowlist lookup failed", {
      code: error.code,
      message: error.message?.slice(0, 80) ?? null,
    });
    return {
      error:
        "Allowlist check failed (database/RLS). Confirm admin_emails is readable for authenticated organizers, then retry.",
      ok: false,
    };
  }
  if (!data) {
    await supabase.auth.signOut();
    return {
      error:
        "Signed in to Auth, but this email is not on the organizer allowlist (admin_emails). Ask the site admin to add it.",
      ok: false,
    };
  }
  return { ok: true };
}

/** Primary organizer sign-in (no custom SMTP / email templates required). */
export async function signInWithPassword(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  // Do not trim password — spaces may be intentional.
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/admin"));

  if (!email) return { error: "Email is required." };
  if (!password) return { error: "Password is required." };

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    console.info("[auth] createClient failed", {
      message: err instanceof Error ? err.message.slice(0, 120) : "unknown",
    });
    return {
      error: publicAuthError(
        err instanceof Error
          ? err.message
          : "Missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY",
      ),
    };
  }

  let authError: { message?: string; code?: string; status?: number } | null =
    null;
  try {
    const result = await supabase.auth.signInWithPassword({ email, password });
    authError = result.error;
  } catch (err) {
    console.info("[auth] signInWithPassword threw", {
      message: err instanceof Error ? err.message.slice(0, 120) : "unknown",
    });
    return {
      error: publicAuthError(
        err instanceof Error ? err.message : "failed to fetch",
      ),
    };
  }

  if (authError) {
    console.info("[auth] signInWithPassword failed", {
      code: authError.code ?? null,
      status: authError.status ?? null,
      message: authError.message?.slice(0, 100) ?? null,
    });
    return { error: publicAuthError(authError) };
  }

  const allow = await assertAllowlisted(supabase, email);
  if (!allow.ok) return { error: allow.error };

  redirect(next);
}

export async function sendMagicLink(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const next = safeNextPath(String(formData.get("next") ?? "/admin"));

  if (!email) return { error: "Email is required." };

  let siteUrl: string;
  try {
    siteUrl = getSiteUrl();
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Site URL is not configured for magic-link sign-in.",
    };
  }

  // Optional path: default Supabase mailer cannot customize templates without SMTP.
  const emailRedirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    return {
      error: publicAuthError(
        err instanceof Error ? err.message : "Missing Supabase env",
      ),
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) return { error: publicAuthError(error) };
  return {
    success: true,
    email,
    message:
      "If email arrives, prefer the 6-digit code below. Magic links often fail on the default Supabase mailer — use email + password when possible.",
  };
}

export async function verifyEmailOtp(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const token = String(formData.get("token") ?? "")
    .trim()
    .replace(/\s+/g, "");
  const next = safeNextPath(String(formData.get("next") ?? "/admin"));

  if (!email) return { error: "Email is required." };
  if (!/^\d{6,10}$/.test(token)) {
    return { error: "Enter the 6-digit code from your email." };
  }

  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (err) {
    return {
      error: publicAuthError(
        err instanceof Error ? err.message : "Missing Supabase env",
      ),
    };
  }

  let lastError: { message?: string; code?: string } | null = null;
  for (const type of ["email", "magiclink"] as const) {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type,
    });
    if (!error) {
      const allow = await assertAllowlisted(supabase, email);
      if (!allow.ok) return { error: allow.error };
      redirect(next);
    }
    lastError = error;
    console.info("[auth] verifyEmailOtp failed", {
      type,
      code: error.code ?? null,
    });
  }

  return { error: publicAuthError(lastError) };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
