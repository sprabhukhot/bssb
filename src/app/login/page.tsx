import Link from "next/link";
import { OrganizerShell } from "@/components/organizer-shell";
import { LoginForm } from "@/components/login-form";
import { loginErrorFromParams } from "@/lib/auth-errors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next || "/admin";
  const initialError = loginErrorFromParams(params.error, params.reason);

  return (
    <OrganizerShell
      right={
        <Link className="btn btn-ghost" href="/">
          Home
        </Link>
      }
    >
      <main className="shell portal-page">
        <p className="portal-kicker">For BSSB volunteers</p>
        <h1 className="page-title">Organizer sign in</h1>
        <p className="page-lead">
          Sign in with your allowlisted email and password. Site admin:{" "}
          <strong>treasurer@bssb.cz</strong> (homepage + organizers); other
          allowlisted emails manage events only. Magic link is optional and
          needs reliable email delivery.
        </p>
        <div className="panel portal-panel" style={{ maxWidth: 440 }}>
          <LoginForm nextPath={nextPath} initialError={initialError} />
        </div>
      </main>
    </OrganizerShell>
  );
}
