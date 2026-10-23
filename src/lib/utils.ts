export {
  DEFAULT_EVENT_TIMEZONE,
  detectBrowserTimeZone,
  formatEventWhen,
  toZonedInputValue,
  zonedDateTimeToIso,
} from "@/lib/timezone";

/** @deprecated Use toZonedInputValue(iso, timeZone). */
export function toLocalInputValue(iso: string | null | undefined): string {
  // Browser-local only — prefer toZonedInputValue with the event timezone.
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Digits and leading + only — matches DB normalize_phone(). */
export function normalizePhone(value: string): string {
  return value.trim().replace(/[^0-9+]/g, "").replace(/(?!^\+)\+/g, "");
}

export function publicEventPath(slug: string): string {
  return `/e/${slug}`;
}

export function publicEventUrl(slug: string, siteUrl?: string | null): string {
  const base = (siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "").replace(
    /\/$/,
    "",
  );
  const path = publicEventPath(slug);
  return base ? `${base}${path}` : path;
}

export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function registrationHeadcount(
  answers: Record<string, unknown> | null | undefined,
  row?: { adults_count?: number; children_count?: number },
): number {
  const a = Number(answers?.adults_count ?? row?.adults_count ?? 0);
  const c = Number(answers?.children_count ?? row?.children_count ?? 0);
  if (a + c > 0) return a + c;
  return 1;
}
