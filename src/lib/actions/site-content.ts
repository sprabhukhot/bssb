"use server";

import { revalidatePath } from "next/cache";
import { requireSiteAdmin } from "@/lib/auth";
import type { SiteContent } from "@/lib/site-content";

function field(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function updateSiteContent(formData: FormData) {
  const { supabase, authorized } = await requireSiteAdmin();
  if (!authorized) {
    return { error: "Only the site admin can edit homepage content." };
  }

  const payload: Omit<SiteContent, "id"> = {
    subtitle: field(formData, "subtitle") || "Preserving & Celebrating Culture",
    hero_headline: field(formData, "hero_headline"),
    hero_body: field(formData, "hero_body"),
    about_title: field(formData, "about_title"),
    about_body: field(formData, "about_body"),
    pillar_1_title: field(formData, "pillar_1_title"),
    pillar_1_body: field(formData, "pillar_1_body"),
    pillar_2_title: field(formData, "pillar_2_title"),
    pillar_2_body: field(formData, "pillar_2_body"),
    pillar_3_title: field(formData, "pillar_3_title"),
    pillar_3_body: field(formData, "pillar_3_body"),
    footer_text: field(formData, "footer_text"),
  };

  if (!payload.hero_headline || !payload.hero_body) {
    return { error: "Headline and hero text are required." };
  }

  const { error } = await supabase
    .from("site_content")
    .upsert({ id: "home", ...payload }, { onConflict: "id" });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/admin/site");
  return { message: "Homepage content saved." };
}
