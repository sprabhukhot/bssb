import Link from "next/link";
import { OrganizerShell } from "@/components/organizer-shell";

/**
 * Click-through before consuming the one-time token.
 * Email scanners / SafeLinks often GET the first URL; verifying only after a
 * real click keeps the magic link valid for the organizer.
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
  // Templates may use type=email or type=magiclink — callback accepts both.
  const type = params.type === "magiclink" ? "magiclink" : "email";
  const next = params.next && params.next.startsWith("/") ? params.next : "/admin";

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
        <p className="portal-kicker">For BSSB volunteers</p>
        <h1 className="page-title">Complete sign in</h1>
        <p className="page-lead">
          Click once below to open the organizer portal. Do not forward the
          email link — it works only once. If this fails, go back to Sign in and
          enter the 6-digit code from the same email.
        </p>
        <div className="panel portal-panel" style={{ maxWidth: 440 }}>
          {hasToken ? (
            <Link className="btn btn-primary" href={callbackHref}>
              Continue to organizer portal
            </Link>
          ) : (
            <p className="form-error">
              This sign-in link is missing its token. Request a new magic link
              from the login page, or enter the 6-digit code there.
            </p>
          )}
        </div>
      </main>
    </OrganizerShell>
  );
}
