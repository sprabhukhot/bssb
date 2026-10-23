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
  DEFAULT_EVENT_TIMEZONE,
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  type EventInput,
} from "@/lib/types";
import { slugify, zonedDateTimeToIso } from "@/lib/utils";

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
  const startsRaw = String(formData.get("starts_at") ?? "").trim();
  const endsRaw = String(formData.get("ends_at") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const timezoneRaw = String(formData.get("timezone") ?? "").trim();
  const timezone = timezoneRaw || DEFAULT_EVENT_TIMEZONE;
  const is_published = formData.get("is_published") === "on";
  const formFields = parseFormFieldsJson(formData.get("form_fields_json"));

  if (!title) return { error: "Title is required." };
  if (!startsRaw) return { error: "Start date/time is required." };

  const slug = slugify(slugRaw || title);
  if (!slug) return { error: "A valid slug is required." };

  const capacity = parseOptionalPositive(capacityRaw, "Capacity");
  if (capacity && typeof capacity === "object" && "error" in capacity) {
    return capacity;
  }

  const fieldsError = validateFormFieldsConfig(formFields);
  if (fieldsError) return { error: fieldsError };

  let starts_at: string;
  let ends_at: string | null = null;
  try {
    starts_at = zonedDateTimeToIso(startsRaw, timezone);
    if (endsRaw) ends_at = zonedDateTimeToIso(endsRaw, timezone);
  } catch {
    return { error: "Invalid start or end date/time." };
  }

  return {
    title,
    slug,
    description,
    location,
    starts_at,
    ends_at,
    timezone,
    capacity: capacity as number | null,
    max_adults: null,
    max_children: null,
    form_fields: formFields,
    poster_url: null,
    donation_image_url: null,
    is_published,
  };
}

async function uploadEventImage(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  eventId: string,
  formData: FormData,
  opts: {
    fileKey: string;
    removeKey: string;
    folder: string;
    currentUrl: string | null;
    label: string;
  },
): Promise<{ url: string | null } | { error: string }> {
  const remove = formData.get(opts.removeKey) === "1";
  const file = formData.get(opts.fileKey);

  if (remove && !(file instanceof File && file.size > 0)) {
    return { url: null };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { url: opts.currentUrl };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `${opts.label} must be 2 MB or smaller.` };
  }
  if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { error: `${opts.label} must be JPG, PNG, or WebP.` };
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${eventId}/${opts.folder}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("event-posters")
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.info("[events] image upload failed", {
      folder: opts.folder,
      message: uploadError.message,
    });
    return {
      error: `Could not upload ${opts.label.toLowerCase()}. Ensure Storage bucket event-posters exists (see docs).`,
    };
  }

  const { data } = supabase.storage.from("event-posters").getPublicUrl(path);
  return { url: data.publicUrl };
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
      timezone: parsed.timezone,
      capacity: parsed.capacity,
      max_adults: parsed.max_adults,
      max_children: parsed.max_children,
      form_fields: parsed.form_fields,
      poster_url: null,
      donation_image_url: null,
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

  const poster = await uploadEventImage(supabase, data.id, formData, {
    fileKey: "poster",
    removeKey: "remove_poster",
    folder: "poster",
    currentUrl: null,
    label: "Poster",
  });
  if ("error" in poster) {
    revalidatePath("/admin");
    redirect(`/admin/events/${data.id}?image_error=1`);
  }

  const donation = await uploadEventImage(supabase, data.id, formData, {
    fileKey: "donation_image",
    removeKey: "remove_donation_image",
    folder: "donation",
    currentUrl: null,
    label: "Donation image",
  });
  if ("error" in donation) {
    revalidatePath("/admin");
    redirect(`/admin/events/${data.id}?image_error=1`);
  }

  if (poster.url || donation.url) {
    await supabase
      .from("events")
      .update({
        poster_url: poster.url,
        donation_image_url: donation.url,
      })
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
    .select("poster_url, donation_image_url")
    .eq("id", eventId)
    .maybeSingle();

  const poster = await uploadEventImage(supabase, eventId, formData, {
    fileKey: "poster",
    removeKey: "remove_poster",
    folder: "poster",
    currentUrl: existing?.poster_url ?? null,
    label: "Poster",
  });
  if ("error" in poster) return poster;

  const donation = await uploadEventImage(supabase, eventId, formData, {
    fileKey: "donation_image",
    removeKey: "remove_donation_image",
    folder: "donation",
    currentUrl: existing?.donation_image_url ?? null,
    label: "Donation image",
  });
  if ("error" in donation) return donation;

  const { error } = await supabase
    .from("events")
    .update({
      title: parsed.title,
      slug: parsed.slug,
      description: parsed.description,
      location: parsed.location,
      starts_at: parsed.starts_at,
      ends_at: parsed.ends_at,
      timezone: parsed.timezone,
      capacity: parsed.capacity,
      form_fields: parsed.form_fields as FormField[],
      poster_url: poster.url,
      donation_image_url: donation.url,
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
      timezone: source.timezone || DEFAULT_EVENT_TIMEZONE,
      capacity: source.capacity,
      max_adults: source.max_adults,
      max_children: source.max_children,
      form_fields: formFields,
      poster_url: source.poster_url,
      donation_image_url: source.donation_image_url,
      is_published: false,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin");
  redirect(`/admin/events/${data.id}`);
}

/** Deletes event (and cascaded registrations). Always allowed for staff. */
export async function deleteEvent(eventId: string) {
  const { supabase, user, isAdmin } = await requireAdmin();
  if (!user || !isAdmin) {
    return { error: "Not authorized." };
  }

  const { count } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) {
    console.info("[events] delete failed", { code: error.code });
    return {
      error:
        error.message ||
        "Could not delete event. Confirm you are signed in as an organizer.",
    };
  }

  revalidatePath("/admin");
  console.info("[events] deleted", { eventId, registrationCount: count ?? 0 });
  redirect("/admin");
}
