import { redirect } from "next/navigation";
import { OrganizersManager } from "@/components/organizers-manager";
import { requireSiteAdmin } from "@/lib/auth";

export default async function AdminOrganizersPage() {
  const { supabase, authorized } = await requireSiteAdmin();
  if (!authorized) redirect("/admin");

  const { data, error } = await supabase
    .from("admin_emails")
    .select("email, role")
    .order("role", { ascending: true })
    .order("email", { ascending: true });

  return (
    <>
      <p className="portal-kicker">Site admin</p>
      <h1 className="page-title">Organizers</h1>
      <p className="page-lead">
        People who can sign in and manage events. Only admins can change this
        list or homepage content. You cannot remove the last admin.
      </p>
      {error ? <p className="form-error">{error.message}</p> : null}
      <OrganizersManager
        initial={(data ?? []).map((row) => ({
          email: row.email,
          role: row.role ?? "organizer",
        }))}
      />
    </>
  );
}
