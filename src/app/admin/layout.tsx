import Link from "next/link";
import { redirect } from "next/navigation";
import { OrganizerShell } from "@/components/organizer-shell";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAdmin } = await requireAdmin();
  if (!user) redirect("/login?next=/admin");

  return (
    <OrganizerShell
      right={
        <>
          <span className="muted" style={{ fontSize: "0.875rem" }}>
            {user.email}
          </span>
          <Link className="btn btn-nav-active" href="/admin">
            Events
          </Link>
          <form action={signOut}>
            <button className="btn btn-ghost" type="submit">
              Sign out
            </button>
          </form>
        </>
      }
    >
      <main className="shell portal-page">
        {!isAdmin ? (
          <div className="panel portal-panel">
            <h1 className="page-title">Almost there</h1>
            <p className="page-lead">
              You are signed in as <strong>{user.email}</strong>, but this email
              is not in the <code>admin_emails</code> allowlist yet. Add it in
              the Supabase Table Editor, then refresh.
            </p>
          </div>
        ) : (
          children
        )}
      </main>
    </OrganizerShell>
  );
}
