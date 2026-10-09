import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { supabase, user: null, isAdmin: false as const };
  }

  const { data } = await supabase
    .from("admin_emails")
    .select("email")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  return {
    supabase,
    user,
    isAdmin: Boolean(data) as boolean,
  };
}
