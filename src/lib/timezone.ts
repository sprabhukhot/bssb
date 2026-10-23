/** Default for BSSB Brno organizers. */
export const DEFAULT_EVENT_TIMEZONE = "Europe/Prague";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Detect browser IANA zone; fall back to Prague. */
export function detectBrowserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && typeof tz === "string") return tz;
  } catch {
    // ignore
  }
  return DEFAULT_EVENT_TIMEZONE;
}

/**
 * Convert a datetime-local wall value (YYYY-MM-DDTHH:mm) in `timeZone`
 * to a UTC ISO string. Does not treat the value as naive UTC.
 */
export function zonedDateTimeToIso(
  localValue: string,
  timeZone: string,
): string {
  const match = localValue
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    throw new Error("Invalid date/time.");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const desiredUtcGuess = Date.UTC(year, month - 1, day, hour, minute);

  let guess = desiredUtcGuess;
  for (let i = 0; i < 4; i++) {
    const parts = getZonedParts(new Date(guess), timeZone);
    const asUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    );
    const delta = desiredUtcGuess - asUtc;
    guess += delta;
    if (delta === 0) break;
  }
  return new Date(guess).toISOString();
}

/** Fill datetime-local from an ISO instant in the event timezone. */
export function toZonedInputValue(
  iso: string | null | undefined,
  timeZone: string,
): string {
  if (!iso) return "";
  const parts = getZonedParts(new Date(iso), timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

function shortZoneName(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    timeZoneName: "short",
    hour: "numeric",
  }).formatToParts(date);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
}

/** Human-readable when, in the event's timezone, with abbreviation. */
export function formatEventWhen(
  startsAt: string,
  endsAt: string | null,
  timeZone: string = DEFAULT_EVENT_TIMEZONE,
): string {
  const zone = timeZone || DEFAULT_EVENT_TIMEZONE;
  const start = new Date(startsAt);
  const abbr = shortZoneName(start, zone);
  const dayFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  });

  if (!endsAt) {
    return `${dayFmt.format(start)}, ${timeFmt.format(start)} ${abbr}`;
  }

  const end = new Date(endsAt);
  const sameDay =
    start.toLocaleDateString("en-CA", { timeZone: zone }) ===
    end.toLocaleDateString("en-CA", { timeZone: zone });

  if (sameDay) {
    return `${dayFmt.format(start)}, ${timeFmt.format(start)} – ${timeFmt.format(end)} ${abbr}`;
  }
  return `${dayFmt.format(start)}, ${timeFmt.format(start)} – ${dayFmt.format(end)}, ${timeFmt.format(end)} ${abbr}`;
}
