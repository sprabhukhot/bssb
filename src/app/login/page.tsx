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
      ? "Sign-in link expired or invalid. Request one new magic link, open it once, and click Continue (old or prefetched links cannot be reused)."
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
          We email a magic link—no password. Use an allowlisted BSSB email.
          The site admin (<strong>treasurer@bssb.cz</strong>) can edit homepage
          content and add organizers; other organizers manage events only.
        </p>
        <div className="panel portal-panel" style={{ maxWidth: 440 }}>
          <LoginForm nextPath={nextPath} initialError={initialError} />
        </div>
      </main>
    </OrganizerShell>
  );
}
