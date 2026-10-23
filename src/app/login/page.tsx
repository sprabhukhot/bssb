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
        <h1 className="page-title">Organizer sign in</h1>
        <div className="panel portal-panel" style={{ maxWidth: 440 }}>
          <LoginForm nextPath={nextPath} initialError={initialError} />
        </div>
      </main>
    </OrganizerShell>
  );
}
