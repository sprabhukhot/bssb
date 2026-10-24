import Link from "next/link";
import { OrganizerShell } from "@/components/organizer-shell";

/**
 * Click-through before consuming the one-time token.
 * Email scanners / SafeLinks often GET the first URL; verifying only after a
 * real click keeps the magic / recovery link valid for the organizer.
 */
export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const token_hash = params.token_hash ?? "";
  const rawType = params.type ?? "email";
  const isRecovery = rawType === "recovery";
  const type =
    rawType === "magiclink"
      ? "magiclink"
      : rawType === "recovery"
        ? "recovery"
        : "email";
  const next = isRecovery
    ? "/auth/reset"
    : params.next && params.next.startsWith("/")
      ? params.next
      : "/admin";

  const callbackQuery = new URLSearchParams({
    token_hash,
    type,
    next,
  });
  const callbackHref = `/auth/callback?${callbackQuery.toString()}`;
  const hasToken = Boolean(token_hash);

  return (
    <OrganizerShell
      right={
        <Link className="btn btn-ghost" href="/login">
          Sign in
        </Link>
      }
    >
      <main className="shell portal-page">
        <h1 className="page-title">
          {isRecovery ? "Continue password reset" : "Complete sign in"}
        </h1>
        <div className="panel portal-panel" style={{ maxWidth: 440 }}>
          {hasToken ? (
            <Link className="btn btn-primary" href={callbackHref}>
              {isRecovery
                ? "Continue to set new password"
                : "Continue to organizer portal"}
            </Link>
          ) : (
            <p className="form-error">
              This link is missing its token. Request a new email from the login
              page, or set the password in Supabase → Authentication → Users.
            </p>
          )}
        </div>
      </main>
    </OrganizerShell>
  );
}
