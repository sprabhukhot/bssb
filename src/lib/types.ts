export type EventRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  max_adults: number | null;
  max_children: number | null;
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
  created_at: string;
};

export type EventInput = {
  title: string;
  slug: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  max_adults: number | null;
  max_children: number | null;
  is_published: boolean;
};

/** Navratri-sensible defaults when admin leaves party max blank on create. */
export const DEFAULT_MAX_ADULTS = 10;
export const DEFAULT_MAX_CHILDREN = 5;
export const SAFETY_PARTY_CEILING = 200;
