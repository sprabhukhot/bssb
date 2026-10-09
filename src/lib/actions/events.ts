"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import {
  DEFAULT_MAX_ADULTS,
  DEFAULT_MAX_CHILDREN,
  type EventInput,
} from "@/lib/types";

function parseOptionalPositive(
  raw: string,
  label: string,
  allowZero = false,
): number | null | { error: string } {
  if (!raw) return null;
  const n = Number(raw);
  const min = allowZero ? 0 : 1;
  if (!Number.isInteger(n) || n < min) {
    return {
      error: `${label} must be a whole number${allowZero ? " ≥ 0" : " ≥ 1"}, or blank.`,
    };
  }
  return n;
}

function parseEventForm(formData: FormData): EventInput | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const starts_at = String(formData.get("starts_at") ?? "").trim();
  const endsRaw = String(formData.get("ends_at") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const maxAdultsRaw = String(formData.get("max_adults") ?? "").trim();
  const maxChildrenRaw = String(formData.get("max_children") ?? "").trim();
  const is_published = formData.get("is_published") === "on";
  const applyNavratriDefaults =
    formData.get("apply_party_defaults") === "on" ||
    formData.get("apply_party_defaults") === "1";

  if (!title) return { error: "Title is required." };
  if (!starts_at) return { error: "Start date/time is required." };

  const slug = slugify(slugRaw || title);
  if (!slug) return { error: "A valid slug is required." };

  const capacity = parseOptionalPositive(capacityRaw, "Capacity");
  if (capacity && typeof capacity === "object" && "error" in capacity) {
    return capacity;
  }

  let max_adults = parseOptionalPositive(maxAdultsRaw, "Max adults");
  if (max_adults && typeof max_adults === "object" && "error" in max_adults) {
    return max_adults;
  }
  let max_children = parseOptionalPositive(
    maxChildrenRaw,
    "Max children",
    true,
  );
  if (
    max_children &&
    typeof max_children === "object" &&
    "error" in max_children
  ) {
    return max_children;
  }

  // New events: Navratri-sensible defaults when fields left blank
  if (applyNavratriDefaults) {
    if (max_adults === null) max_adults = DEFAULT_MAX_ADULTS;
    if (max_children === null) max_children = DEFAULT_MAX_CHILDREN;
  }

  return {
    title,
    slug,
    description,
    location,
    starts_at: new Date(starts_at).toISOString(),
    ends_at: endsRaw ? new Date(endsRaw).toISOString() : null,
    capacity: capacity as number | null,
    max_adults: max_adults as number | null,
    max_children: max_children as number | null,
    is_published,
  };
}

export async function createEvent(formData: FormData) {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) {
    return {
      error: "Not authorized. Add your email to admin_emails in Supabase.",
    };
  }

  // Prefer defaults on create when max fields blank
  formData.set("apply_party_defaults", "1");
  const parsed = parseEventForm(formData);
  if ("error" in parsed) return parsed;

  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed, created_by: user.id })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "That slug is already in use. Choose another." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin");
  redirect(`/admin/events/${data.id}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) {
    return { error: "Not authorized." };
  }

  const parsed = parseEventForm(formData);
  if ("error" in parsed) return parsed;

  const { error } = await supabase
    .from("events")
    .update(parsed)
    .eq("id", eventId);

  if (error) {
    if (error.code === "23505") {
      return { error: "That slug is already in use. Choose another." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/e/${parsed.slug}`);
  return { success: true };
}

export async function duplicateEvent(eventId: string) {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) {
    return { error: "Not authorized." };
  }

  const { data: source, error: readError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (readError || !source) {
    return { error: readError?.message ?? "Event not found." };
  }

  let newSlug = `${source.slug}-copy`;
  for (let i = 2; i < 50; i++) {
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .eq("slug", newSlug)
      .maybeSingle();
    if (!existing) break;
    newSlug = `${source.slug}-copy-${i}`;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: `${source.title} (copy)`,
      slug: newSlug,
      description: source.description,
      location: source.location,
      starts_at: source.starts_at,
      ends_at: source.ends_at,
      capacity: source.capacity,
      max_adults: source.max_adults,
      max_children: source.max_children,
      is_published: false,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin");
  redirect(`/admin/events/${data.id}`);
}

export async function deleteEvent(eventId: string) {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) {
    return { error: "Not authorized." };
  }

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return { error: error.message };

  revalidatePath("/admin");
  redirect("/admin");
}
