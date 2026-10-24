import Link from "next/link";
import { OrganizerShell } from "@/components/organizer-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function AuthResetPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    code?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <OrganizerShell
      right={
        <Link className="btn btn-ghost" href="/login">
          Sign in
        </Link>
      }
    >
      <main className="shell portal-page">
        <h1 className="page-title">Set new password</h1>
        <div className="panel portal-panel" style={{ maxWidth: 440 }}>
          <ResetPasswordForm
            tokenHash={params.token_hash}
            code={params.code}
          />
        </div>
      </main>
    </OrganizerShell>
  );
}
