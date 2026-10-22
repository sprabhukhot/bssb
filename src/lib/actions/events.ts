"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  parseFormFieldsJson,
  validateFormFieldsConfig,
  type FormField,
} from "@/lib/form-fields";
import {
  MAX_POSTER_BYTES,
  POSTER_MIME_TYPES,
  type EventInput,
} from "@/lib/types";
import { slugify } from "@/lib/utils";

function parseOptionalPositive(
  raw: string,
  label: string,
): number | null | { error: string } {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    return { error: `${label} must be a whole number ≥ 1, or blank.` };
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
  const is_published = formData.get("is_published") === "on";
  const formFields = parseFormFieldsJson(formData.get("form_fields_json"));

  if (!title) return { error: "Title is required." };
  if (!starts_at) return { error: "Start date/time is required." };

  const slug = slugify(slugRaw || title);
  if (!slug) return { error: "A valid slug is required." };

  const capacity = parseOptionalPositive(capacityRaw, "Capacity");
  if (capacity && typeof capacity === "object" && "error" in capacity) {
    return capacity;
  }

  const fieldsError = validateFormFieldsConfig(formFields);
  if (fieldsError) return { error: fieldsError };

  return {
    title,
    slug,
    description,
    location,
    starts_at: new Date(starts_at).toISOString(),
    ends_at: endsRaw ? new Date(endsRaw).toISOString() : null,
    capacity: capacity as number | null,
    max_adults: null,
    max_children: null,
    form_fields: formFields,
    poster_url: null,
    is_published,
  };
}

async function uploadPoster(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  eventId: string,
  formData: FormData,
  currentUrl: string | null,
): Promise<{ poster_url: string | null } | { error: string }> {
  const remove = formData.get("remove_poster") === "1";
  const file = formData.get("poster");

  if (remove && !(file instanceof File && file.size > 0)) {
    return { poster_url: null };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { poster_url: currentUrl };
  }

  if (file.size > MAX_POSTER_BYTES) {
    return { error: "Poster must be 2 MB or smaller." };
  }
  if (!(POSTER_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { error: "Poster must be JPG, PNG, or WebP." };
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${eventId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("event-posters")
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.info("[events] poster upload failed", { message: uploadError.message });
    return {
      error:
        "Could not upload poster. Create a public Storage bucket named event-posters (see docs).",
    };
  }

  const { data } = supabase.storage.from("event-posters").getPublicUrl(path);
  return { poster_url: data.publicUrl };
}

export async function createEvent(formData: FormData) {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) {
    return {
      error: "Not authorized. Add your email to admin_emails in Supabase.",
    };
  }

  const parsed = parseEventForm(formData);
  if ("error" in parsed) return parsed;

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: parsed.title,
      slug: parsed.slug,
      description: parsed.description,
      location: parsed.location,
      starts_at: parsed.starts_at,
      ends_at: parsed.ends_at,
      capacity: parsed.capacity,
      max_adults: parsed.max_adults,
      max_children: parsed.max_children,
      form_fields: parsed.form_fields,
      poster_url: null,
      is_published: parsed.is_published,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "That slug is already in use. Choose another." };
    }
    return { error: error.message };
  }

  const poster = await uploadPoster(supabase, data.id, formData, null);
  if ("error" in poster) {
    // Event exists; surface upload issue but keep the event.
    revalidatePath("/admin");
    redirect(`/admin/events/${data.id}?poster_error=1`);
  }

  if (poster.poster_url) {
    await supabase
      .from("events")
      .update({ poster_url: poster.poster_url })
      .eq("id", data.id);
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

  const { data: existing } = await supabase
    .from("events")
    .select("poster_url")
    .eq("id", eventId)
    .maybeSingle();

  const poster = await uploadPoster(
    supabase,
    eventId,
    formData,
    existing?.poster_url ?? null,
  );
  if ("error" in poster) return poster;

  const { error } = await supabase
    .from("events")
    .update({
      title: parsed.title,
      slug: parsed.slug,
      description: parsed.description,
      location: parsed.location,
      starts_at: parsed.starts_at,
      ends_at: parsed.ends_at,
      capacity: parsed.capacity,
      form_fields: parsed.form_fields as FormField[],
      poster_url: poster.poster_url,
      is_published: parsed.is_published,
    })
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

  const formFields = parseFormFieldsJson(source.form_fields);

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
      form_fields: formFields,
      poster_url: source.poster_url,
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
