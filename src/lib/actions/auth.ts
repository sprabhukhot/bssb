"use server";

import { redirect } from "next/navigation";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const next = String(formData.get("next") ?? "/admin");

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

  // Allow-listed redirect for Supabase; the Magic Link email template should
  // use token_hash → /auth/confirm (not PKCE ConfirmationURL) so the link
  // works in whichever browser opens the email.
  const emailRedirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) return { error: error.message };
  return {
    success: true,
    message:
      "Check your email for a magic link. Open it once — use Continue on the confirm page — then wait if you see a rate-limit error.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
