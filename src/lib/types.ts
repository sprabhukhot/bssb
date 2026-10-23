import type { FormField } from "@/lib/form-fields";
import { DEFAULT_EVENT_TIMEZONE } from "@/lib/timezone";

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  capacity: number | null;
  max_adults: number | null;
  max_children: number | null;
  form_fields: FormField[] | unknown;
  poster_url: string | null;
  donation_image_url: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type RegistrationRow = {
  id: string;
  event_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  adults_count: number;
  children_count: number;
  dandiya_sets: number;
  samosas: number;
  kachoris: number;
  teas: number;
  jalebis: number;
  payment_acknowledged: boolean;
  data_consent: boolean;
  comments: string | null;
  answers: Record<string, unknown> | null;
  created_at: string;
};

export type EventInput = {
  title: string;
  slug: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  capacity: number | null;
  max_adults: number | null;
  max_children: number | null;
  form_fields: FormField[];
  poster_url: string | null;
  donation_image_url: string | null;
  is_published: boolean;
};

/** @deprecated Prefer per-field min/max on form number fields. */
export const DEFAULT_MAX_ADULTS = 10;
/** @deprecated Prefer per-field min/max on form number fields. */
export const DEFAULT_MAX_CHILDREN = 5;
export const SAFETY_PARTY_CEILING = 200;

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
/** @deprecated Use MAX_IMAGE_BYTES */
export const MAX_POSTER_BYTES = MAX_IMAGE_BYTES;
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
/** @deprecated Use IMAGE_MIME_TYPES */
export const POSTER_MIME_TYPES = IMAGE_MIME_TYPES;

export { DEFAULT_EVENT_TIMEZONE };
