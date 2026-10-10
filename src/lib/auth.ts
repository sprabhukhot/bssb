import { createClient } from "@/lib/supabase/server";

export type StaffRole = "admin" | "organizer";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      supabase,
      user: null,
      isAdmin: false as const,
      isSiteAdmin: false as const,
      role: null as StaffRole | null,
    };
  }

  const { data } = await supabase
    .from("admin_emails")
    .select("email, role")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  const role = (data?.role as StaffRole | undefined) ?? null;
  const isAdmin = Boolean(data);
  const isSiteAdmin = role === "admin";

  return {
    supabase,
    user,
    isAdmin,
    isSiteAdmin,
    role,
  };
}

export async function requireSiteAdmin() {
  const ctx = await requireAdmin();
  return {
    ...ctx,
    authorized: Boolean(ctx.user && ctx.isSiteAdmin),
  };
}
