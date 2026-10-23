import { redirect } from "next/navigation";
import { SiteContentForm } from "@/components/site-content-form";
import { requireSiteAdmin } from "@/lib/auth";
import { DEFAULT_SITE_CONTENT, mergeSiteContent } from "@/lib/site-content";

export default async function AdminSiteContentPage() {
  const { supabase, authorized } = await requireSiteAdmin();
  if (!authorized) redirect("/admin");

  const { data } = await supabase
    .from("site_content")
    .select("*")
    .eq("id", "home")
    .maybeSingle();

  const content = mergeSiteContent(data ?? DEFAULT_SITE_CONTENT);

  return (
    <>
      <h1 className="page-title">Site content</h1>
      <div className="panel portal-panel" style={{ maxWidth: 720 }}>
        <SiteContentForm initial={content} />
      </div>
    </>
  );
}
