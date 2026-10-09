"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/utils";
import { SAFETY_PARTY_CEILING } from "@/lib/types";

function parseCount(
  formData: FormData,
  key: string,
  min: number,
  max: number,
): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

export async function registerForEvent(eventId: string, formData: FormData) {
  const supabase = await createClient();

  const full_name = String(formData.get("full_name") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const comments = String(formData.get("comments") ?? "").trim();
  const payment_acknowledged = formData.get("payment_acknowledged") === "on";
  const data_consent = formData.get("data_consent") === "on";

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, slug, is_published, max_adults, max_children, capacity",
    )
    .eq("id", eventId)
    .single();

  if (eventError || !event || !event.is_published) {
    return { error: "This event is not open for registration." };
  }

  const maxAdults = event.max_adults ?? SAFETY_PARTY_CEILING;
  const maxChildren = event.max_children ?? SAFETY_PARTY_CEILING;

  const adults_count = parseCount(formData, "adults_count", 1, maxAdults);
  const children_count = parseCount(
    formData,
    "children_count",
    0,
    maxChildren,
  );
  const dandiya_sets = parseCount(formData, "dandiya_sets", 0, 50);
  const samosas = parseCount(formData, "samosas", 0, 50);
  const kachoris = parseCount(formData, "kachoris", 0, 50);
  const teas = parseCount(formData, "teas", 0, 50);
  const jalebis = parseCount(formData, "jalebis", 0, 50);

  if (!full_name) return { error: "Please enter your full name." };
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return { error: "Please enter a valid email, or leave it blank." };
  }
  if (!phone) return { error: "Please enter a contact number." };
  if (adults_count == null) {
    return {
      error: `Enter number of adults (1–${maxAdults}).`,
    };
  }
  if (children_count == null) {
    return {
      error: `Enter number of children (0–${maxChildren}).`,
    };
  }
  if (
    dandiya_sets == null ||
    samosas == null ||
    kachoris == null ||
    teas == null ||
    jalebis == null
  ) {
    return { error: "Enter quantities for snacks / dandiya (use 0 if none)." };
  }
  if (!payment_acknowledged) {
    return {
      error:
        "Please confirm that registration is valid only after payment is received.",
    };
  }
  if (!data_consent) {
    return { error: "Please consent to personal data processing to continue." };
  }

  const { error } = await supabase.rpc("register_attendee", {
    p_event_id: eventId,
    p_full_name: full_name,
    p_email: emailRaw || null,
    p_phone: phone,
    p_adults_count: adults_count,
    p_children_count: children_count,
    p_dandiya_sets: dandiya_sets,
    p_samosas: samosas,
    p_kachoris: kachoris,
    p_teas: teas,
    p_jalebis: jalebis,
    p_payment_acknowledged: payment_acknowledged,
    p_data_consent: data_consent,
    p_comments: comments || null,
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
    if (msg.includes("PAYMENT_ACK_REQUIRED")) {
      return { error: "Please acknowledge the payment confirmation rule." };
    }
    if (msg.includes("CONSENT_REQUIRED")) {
      return { error: "Please consent to personal data processing." };
    }
    if (msg.includes("PHONE_REQUIRED")) {
      return { error: "Please enter a contact number." };
    }
    if (msg.includes("INVALID_ADULTS")) {
      return { error: `Enter a valid adults count (1–${maxAdults}).` };
    }
    if (msg.includes("INVALID_CHILDREN")) {
      return { error: `Enter a valid children count (0–${maxChildren}).` };
    }
    return { error: error.message };
  }

  redirect(`/e/${event.slug}/thanks`);
}
