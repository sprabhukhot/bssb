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

export function formatEventWhen(
  startsAt: string,
  endsAt: string | null,
  timeZone = "Asia/Kolkata",
): string {
  const start = new Date(startsAt);
  const fmt = new Intl.DateTimeFormat("en-IN", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (!endsAt) return fmt.format(start);
  const end = new Date(endsAt);
  const sameDay =
    start.toLocaleDateString("en-CA", { timeZone }) ===
    end.toLocaleDateString("en-CA", { timeZone });
  if (sameDay) {
    const day = new Intl.DateTimeFormat("en-IN", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(start);
    const timeFmt = new Intl.DateTimeFormat("en-IN", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    });
    return `${day}, ${timeFmt.format(start)} – ${timeFmt.format(end)} IST`;
  }
  return `${fmt.format(start)} – ${fmt.format(end)} IST`;
}

export function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
