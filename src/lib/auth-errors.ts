/** Map Supabase auth failures to safe, user-facing copy (no secrets / raw dumps). */
export function publicAuthError(message: string | null | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (
    m.includes("invalid login") ||
    m.includes("invalid credentials") ||
    m.includes("invalid_credentials")
  ) {
    return "Wrong email or password. Check both, or ask an admin to reset the password in Supabase Auth → Users.";
  }
  if (m.includes("email not confirmed") || m.includes("not_confirmed")) {
    return "This account is not confirmed yet. In Supabase Auth → Users, open the user and confirm the email (or recreate with Auto Confirm).";
  }
  if (m.includes("rate limit") || m.includes("over_email_send_rate_limit")) {
    return "Email rate limit exceeded. Prefer email + password sign-in, or wait and try magic link once.";
  }
  if (m.includes("otp_expired") || m.includes("expired")) {
    return "That code or link expired. Prefer email + password, or request a new magic link.";
  }
  if (m.includes("access_denied")) {
    return "Sign-in was denied. Use email + password, or request a fresh magic link.";
  }
  if (m.includes("invalid") || m.includes("otp_disabled")) {
    return "Invalid code or credentials. Use email + password, or check the latest email code.";
  }
  return "Sign-in failed. Use email + password with an allowlisted organizer email.";
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
  if (m.includes("otp_expired") || m.includes("expired")) return "expired";
  if (m.includes("access_denied")) return "expired";
  return "auth";
}
