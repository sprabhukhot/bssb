/** Safe, distinct Auth error copy — never collapse every failure into “wrong password”. */

export type AuthErrorLike = {
  message?: string | null;
  code?: string | null;
  status?: number | null;
  name?: string | null;
};

function asParts(
  error: AuthErrorLike | string | null | undefined,
): { code: string; message: string } {
  if (error == null) return { code: "", message: "" };
  if (typeof error === "string") {
    return { code: "", message: error };
  }
  return {
    code: String(error.code ?? "").toLowerCase(),
    message: String(error.message ?? ""),
  };
}

/**
 * Map Supabase Auth / network failures to distinct organizer-facing messages.
 * Prefer `error.code` when present; fall back to message substrings carefully
 * (avoid broad matches like bare "invalid" that swallow unrelated failures).
 */
export function publicAuthError(
  error: AuthErrorLike | string | null | undefined,
): string {
  const { code, message } = asParts(error);
  const m = message.toLowerCase();

  // --- Email confirmation ---
  if (
    code === "email_not_confirmed" ||
    m.includes("email not confirmed") ||
    m.includes("email_not_confirmed")
  ) {
    return "Email not confirmed. In Supabase → Authentication → Users, open this user and confirm the email (or recreate with Auto Confirm). Also turn Confirm email OFF under Authentication → Providers → Email if organizers should sign in immediately.";
  }

  // --- Wrong email/password only ---
  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    m.includes("invalid login credentials") ||
    m.includes("invalid_credentials")
  ) {
    return "Wrong email or password (Supabase Auth rejected this pair). Confirm Authentication → Providers → Email is enabled, then reset the password under Authentication → Users.";
  }

  // --- Provider / password sign-in disabled ---
  if (
    code === "email_provider_disabled" ||
    code === "signup_disabled" ||
    m.includes("email logins are disabled") ||
    m.includes("provider is not enabled") ||
    m.includes("password signups are disabled") ||
    m.includes("phone logins are disabled")
  ) {
    return "Email/password sign-in is disabled in this Supabase project. Open Authentication → Providers → Email → enable Email (and keep password sign-in available).";
  }

  // --- Rate limits ---
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    m.includes("rate limit") ||
    m.includes("too many requests")
  ) {
    return "Rate limit exceeded. Wait a minute, then retry email + password (avoid magic link until the limit clears).";
  }

  // --- OTP / magic link specific (not password) ---
  if (
    code === "otp_expired" ||
    code === "otp_disabled" ||
    m.includes("otp_expired") ||
    m.includes("token has expired") ||
    m.includes("otp has expired")
  ) {
    return "That email code or magic link expired. Prefer email + password, or request a new code.";
  }
  if (m.includes("access_denied") && m.includes("otp")) {
    return "Magic-link/OTP was denied. Prefer email + password.";
  }

  // --- Network / env / fetch (must not look like wrong password) ---
  if (
    m.includes("failed to fetch") ||
    m.includes("fetch failed") ||
    m.includes("networkerror") ||
    m.includes("network request failed") ||
    m.includes("load failed") ||
    code === "unexpected_failure"
  ) {
    return "Could not reach Supabase. Check Netlify env NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (project nberqbgaqukcepskvbmb), redeploy, then retry.";
  }

  if (
    m.includes("missing next_public_supabase") ||
    m.includes("supabase_url") ||
    m.includes("anon_key") ||
    m.includes("publishable")
  ) {
    return "Supabase env is missing or misconfigured on the server. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Netlify, then redeploy.";
  }

  // Generic fallback — include short safe detail so it is not mistaken for wrong password
  const hint = message.trim()
    ? ` (${message.trim().slice(0, 120)})`
    : code
      ? ` (code: ${code})`
      : "";
  return `Sign-in failed${hint}. This is not classified as a wrong-password error — check allowlist, Email provider settings, and Netlify env.`;
}

export function loginErrorFromParams(
  error?: string,
  reason?: string,
): string | undefined {
  if (error !== "auth") return undefined;
  switch (reason) {
    case "expired":
    case "pkce":
    case "missing":
    case "type":
      return "Magic-link sign-in failed (default Supabase email cannot use a custom template without SMTP). Use email + password below.";
    default:
      return "Magic-link sign-in failed. Use email + password with your allowlisted organizer email.";
  }
}

export function authFailureReason(
  message: string | null | undefined,
  opts?: { usedCodeOnly?: boolean; missingToken?: boolean; typeIssue?: boolean },
): string {
  if (opts?.missingToken) return "missing";
  if (opts?.typeIssue) return "type";
  if (opts?.usedCodeOnly) return "pkce";
  const m = (message ?? "").toLowerCase();
  if (m.includes("otp_expired") || m.includes("token has expired")) return "expired";
  if (m.includes("access_denied")) return "expired";
  return "auth";
}

/** True when Next.js redirect() aborted the server action (must rethrow on the client). */
export function isNextRedirectError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const digest =
    "digest" in err && typeof (err as { digest: unknown }).digest === "string"
      ? (err as { digest: string }).digest
      : "";
  return digest.startsWith("NEXT_REDIRECT");
}
