"use server";

import { redirect } from "next/navigation";
import {
  isChoiceFieldType,
  parseFormFieldsJson,
  type AnswersMap,
  type FormField,
} from "@/lib/form-fields";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/utils";

function choiceIds(field: FormField): Set<string> {
  return new Set((field.choices ?? []).map((c) => c.id));
}

function collectAnswers(
  fields: FormField[],
  formData: FormData,
): { ok: true; answers: AnswersMap } | { ok: false; error: string } {
  const answers: AnswersMap = {};

  for (const field of fields) {
    const key = `field_${field.id}`;

    if (field.type === "checkbox") {
      const on = formData.get(key) === "on";
      if (field.required && !on) {
        return { ok: false, error: `Please confirm: ${field.label}` };
      }
      answers[field.id] = on;
      continue;
    }

    if (field.type === "multi_choice") {
      const selected = formData
        .getAll(key)
        .map((v) => String(v).trim())
        .filter(Boolean);
      const allowed = choiceIds(field);
      if (selected.some((id) => !allowed.has(id))) {
        return {
          ok: false,
          error: `Choose a valid option for ${field.label}.`,
        };
      }
      if (field.required && selected.length === 0) {
        return { ok: false, error: `${field.label} is required.` };
      }
      if (selected.length) answers[field.id] = selected;
      continue;
    }

    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) {
      if (field.required) {
        return { ok: false, error: `${field.label} is required.` };
      }
      continue;
    }

    if (field.type === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
        return {
          ok: false,
          error: `Enter a valid email for ${field.label}.`,
        };
      }
      answers[field.id] = raw.toLowerCase();
      continue;
    }

    if (field.type === "phone") {
      const phone = normalizePhone(raw);
      if (!phone) {
        return { ok: false, error: `Enter a valid ${field.label}.` };
      }
      answers[field.id] = phone;
      if (!answers.phone) answers.phone = phone;
      continue;
    }

    if (field.type === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        return { ok: false, error: `${field.label} must be a whole number.` };
      }
      if (field.min != null && n < field.min) {
        return {
          ok: false,
          error: `${field.label} must be at least ${field.min}.`,
        };
      }
      if (field.max != null && n > field.max) {
        return {
          ok: false,
          error: `${field.label} must be at most ${field.max}.`,
        };
      }
      answers[field.id] = n;
      continue;
    }

    if (isChoiceFieldType(field.type)) {
      const allowed = choiceIds(field);
      // Accept choice id, or legacy label (older dropdown events)
      const labels = new Set((field.choices ?? []).map((c) => c.label));
      if (!allowed.has(raw) && !labels.has(raw)) {
        return {
          ok: false,
          error: `Choose a valid option for ${field.label}.`,
        };
      }
      answers[field.id] = raw;
      continue;
    }

    answers[field.id] = raw;
    if (
      field.id === "full_name" ||
      (!answers.full_name && field.type === "short_text")
    ) {
      if (!answers.full_name) answers.full_name = raw;
    }
  }

  if (!answers.phone) {
    return { ok: false, error: "A phone number is required." };
  }
  if (!answers.full_name) {
    const firstText = fields.find((f) => f.type === "short_text");
    if (firstText && answers[firstText.id] != null) {
      answers.full_name = String(answers[firstText.id]);
    }
  }
  if (!answers.full_name) {
    return { ok: false, error: "A name is required." };
  }

  return { ok: true, answers };
}

export async function registerForEvent(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, slug, is_published, form_fields")
    .eq("id", eventId)
    .single();

  if (eventError || !event || !event.is_published) {
    return { error: "This event is not open for registration." };
  }

  const fields = parseFormFieldsJson(event.form_fields);
  const collected = collectAnswers(fields, formData);
  if (!collected.ok) return { error: collected.error };

  const { error } = await supabase.rpc("register_attendee", {
    p_event_id: eventId,
    p_answers: collected.answers,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.includes("EVENT_FULL")) {
      return { error: "This event is full. Registration is closed." };
    }
    if (msg.includes("ALREADY_REGISTERED")) {
      return {
        error: "This phone number is already registered for this event.",
      };
    }
    if (msg.includes("EVENT_CLOSED")) {
      return { error: "This event is not open for registration." };
    }
    if (msg.includes("PHONE_REQUIRED")) {
      return { error: "Please enter a contact number." };
    }
    if (msg.includes("NAME_REQUIRED")) {
      return { error: "Please enter your name." };
    }
    if (msg.includes("INVALID_EMAIL")) {
      return { error: "Please enter a valid email." };
    }
    if (msg.includes("FIELD_REQUIRED:")) {
      const label = msg.split("FIELD_REQUIRED:")[1] ?? "a required field";
      return { error: `Please complete: ${label}` };
    }
    if (msg.includes("INVALID_OPTION:")) {
      const label = msg.split("INVALID_OPTION:")[1] ?? "a field";
      return { error: `Choose a valid option for ${label}` };
    }
    return { error: error.message };
  }

  redirect(`/e/${event.slug}/thanks`);
}
