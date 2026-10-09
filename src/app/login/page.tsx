import Link from "next/link";
import { OrganizerShell } from "@/components/organizer-shell";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next || "/admin";
  const initialError =
    params.error === "auth"
      ? "Sign-in link expired or invalid. Request a new one."
      : undefined;

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
          We email a magic link—no password. Use an email listed for BSSB event
          organizers (starting with <strong>treasurer@bssb.cz</strong>).
        </p>
        <div className="panel portal-panel" style={{ maxWidth: 440 }}>
          <LoginForm nextPath={nextPath} initialError={initialError} />
        </div>
      </main>
    </OrganizerShell>
  );
}
