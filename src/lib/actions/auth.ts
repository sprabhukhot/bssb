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
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.info("[auth] allowlist lookup failed", { code: error.code });
    return {
      error: "Could not verify organizer access. Try again in a moment.",
      ok: false,
    };
  }
  if (!data) {
    await supabase.auth.signOut();
    return {
      error: "This email is not on the organizer allowlist.",
      ok: false,
    };
  }
  return { ok: true };
}

/** Primary organizer sign-in (no custom SMTP / email templates required). */
export async function signInWithPassword(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/admin"));

  if (!email) return { error: "Email is required." };
  if (!password) return { error: "Password is required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.info("[auth] signInWithPassword failed", { code: error.code ?? null });
    return { error: publicAuthError(error.message) };
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) return { error: publicAuthError(error.message) };
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

  const supabase = await createClient();

  let lastMessage: string | null = null;
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
    lastMessage = error.message;
    console.info("[auth] verifyEmailOtp failed", {
      type,
      code: error.code ?? null,
    });
  }

  return { error: publicAuthError(lastMessage) };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
