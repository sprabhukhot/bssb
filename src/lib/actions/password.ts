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

/** Sends Supabase recovery email. redirectTo must be allowlisted in Auth Redirect URLs. */
export async function requestPasswordReset(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  if (!email) return { error: "Enter your organizer email first." };

  let siteUrl: string;
  try {
    siteUrl = getSiteUrl();
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Site URL is not configured for password reset emails.",
    };
  }

  const redirectTo = `${siteUrl}/auth/reset`;

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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.info("[auth] resetPasswordForEmail failed", {
      code: error.code ?? null,
      message: error.message?.slice(0, 100) ?? null,
    });
    return { error: publicAuthError(error) };
  }

  // Always show success to avoid email enumeration; inbox may still be rate-limited.
  return {
    success: true,
    message:
      "If that email has an Auth user, a reset link was sent. Open it on this device, then choose a new password. If the link only opens the homepage, scroll to the address bar — or ask an admin to set the password in Supabase → Authentication → Users.",
  };
}

/** Sets a new password for the currently authenticated recovery session. */
export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Reset session expired or missing. Request a new forgot-password email, or set the password in Supabase → Authentication → Users.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.info("[auth] updateUser password failed", {
      code: error.code ?? null,
    });
    return { error: publicAuthError(error) };
  }

  redirect("/login?reset=ok");
}
