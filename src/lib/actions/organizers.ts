"use server";

import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/auth";
import type { StaffRole } from "@/lib/auth";

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export async function addOrganizer(formData: FormData) {
  const { supabase, authorized } = await requireSiteAdmin();
  if (!authorized) {
    return { error: "Only the site admin can add organizers." };
  }

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const role = (String(formData.get("role") ?? "organizer") as StaffRole) ||
    "organizer";

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (role !== "admin" && role !== "organizer") {
    return { error: "Invalid role." };
  }

  const { error } = await supabase.from("admin_emails").upsert(
    { email, role },
    { onConflict: "email" },
  );

  if (error) return { error: error.message };

  revalidatePath("/admin/organizers");
  return { message: `${email} added as ${role}.` };
}

export async function removeOrganizer(formData: FormData) {
  const { supabase, authorized, user } = await requireSiteAdmin();
  if (!authorized) {
    return { error: "Only the site admin can remove organizers." };
  }

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { error: "Missing email." };

  const { data: row } = await supabase
    .from("admin_emails")
    .select("email, role")
    .eq("email", email)
    .maybeSingle();

  if (!row) return { error: "Email not found." };

  if (row.role === "admin") {
    const { count } = await supabase
      .from("admin_emails")
      .select("email", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return { error: "You cannot remove the last site admin." };
    }
  }

  if (user?.email && normalizeEmail(user.email) === email && row.role === "admin") {
    const { count } = await supabase
      .from("admin_emails")
      .select("email", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return { error: "You cannot remove the last site admin." };
    }
  }

  const { error } = await supabase
    .from("admin_emails")
    .delete()
    .eq("email", email);

  if (error) {
    if (error.message.includes("CANNOT_REMOVE_LAST_ADMIN")) {
      return { error: "You cannot remove the last site admin." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/organizers");
  return { message: `${email} removed.` };
}
