import type { AnswersMap, FormField } from "@/lib/form-fields";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DONATE_URL = "https://bssb.cz/donate";

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return "";
  if (Array.isArray(value)) return value.map(String).join(" ");
  return String(value).trim();
}

function asCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  const n = Number(asText(value));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.trunc(n));
}

function fieldMatches(field: FormField, pattern: RegExp): boolean {
  return pattern.test(field.id) || pattern.test(field.label);
}

export function registrantName(
  answers: AnswersMap,
  fields: FormField[],
): string {
  const fromKey = asText(answers.full_name || answers.name);
  if (fromKey) return fromKey;

  const named = fields.find(
    (f) =>
      f.type === "short_text" &&
      (fieldMatches(f, /full[_\s-]?name/i) ||
        fieldMatches(f, /(^|_)name$/i) ||
        fieldMatches(f, /\bname\b/i)),
  );
  if (named) {
    const v = asText(answers[named.id]);
    if (v) return v;
  }

  const firstText = fields.find((f) => f.type === "short_text");
  if (firstText) {
    const v = asText(answers[firstText.id]);
    if (v) return v;
  }
  return "guest";
}

export function registrantEmail(
  answers: AnswersMap,
  fields: FormField[],
): string | null {
  const typed = fields.find((f) => f.type === "email");
  if (typed) {
    const v = asText(answers[typed.id]).toLowerCase();
    if (EMAIL_RE.test(v)) return v;
  }
  const fromKey = asText(answers.email).toLowerCase();
  if (EMAIL_RE.test(fromKey)) return fromKey;

  for (const field of fields) {
    const v = asText(answers[field.id]).toLowerCase();
    if (EMAIL_RE.test(v)) return v;
  }
  for (const value of Object.values(answers)) {
    const v = asText(value).toLowerCase();
    if (EMAIL_RE.test(v)) return v;
  }
  return null;
}

function countFromFields(
  answers: AnswersMap,
  fields: FormField[],
  pattern: RegExp,
  fallbackKeys: string[],
): number {
  for (const field of fields) {
    if (!fieldMatches(field, pattern)) continue;
    const n = asCount(answers[field.id]);
    if (n != null) return n;
  }
  for (const key of fallbackKeys) {
    const n = asCount(answers[key]);
    if (n != null) return n;
  }
  return 0;
}

export function adultCount(answers: AnswersMap, fields: FormField[]): number {
  return countFromFields(answers, fields, /\badult/i, ["adults_count", "adults"]);
}

export function childCount(answers: AnswersMap, fields: FormField[]): number {
  return countFromFields(
    answers,
    fields,
    /\b(kid|kids|child|children)\b/i,
    ["children_count", "kids_count", "children", "kids"],
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildConfirmationCopy(opts: {
  name: string;
  eventTitle: string;
  adults: number;
  kids: number;
}): { subject: string; text: string; html: string } {
  const { name, eventTitle, adults, kids } = opts;
  const subject = `Registration received — ${eventTitle}`;
  const greeting = `Thank you ${name} for ${eventTitle}, we have received your entry for ${adults} adults and ${kids} kids.`;
  const looking = "We are looking forward to see you on event day.";
  const donate = `Please consider donating on the QR code below or ${DONATE_URL}`;

  const text = [greeting, "", looking, "", donate].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:Georgia,serif;color:#1a1a1a;line-height:1.5;max-width:560px;">
  <p>${escapeHtml(greeting)}</p>
  <p>${escapeHtml(looking)}</p>
  <p>Please consider donating on the QR code below or <a href="${DONATE_URL}">${DONATE_URL}</a></p>
  {{QR}}
</body>
</html>`;

  return { subject, text, html };
}

export async function sendRegistrationConfirmation(opts: {
  answers: AnswersMap;
  fields: FormField[];
  eventTitle: string;
  donationImageUrl?: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return;

  const to = registrantEmail(opts.answers, opts.fields);
  if (!to) return;

  const name = registrantName(opts.answers, opts.fields);
  const adults = adultCount(opts.answers, opts.fields);
  const kids = childCount(opts.answers, opts.fields);
  const { subject, text, html: htmlTpl } = buildConfirmationCopy({
    name,
    eventTitle: opts.eventTitle,
    adults,
    kids,
  });

  const qr = opts.donationImageUrl
    ? `<p><img src="${escapeHtml(opts.donationImageUrl)}" alt="Donation QR" style="max-width:240px;height:auto;border:1px solid #f0e6da;" /></p>`
    : "";
  const html = htmlTpl.replace("{{QR}}", qr);

  const from =
    process.env.RESEND_FROM?.trim() || "BSSB Events <noreply@bssb.cz>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.info("[confirm-email] resend failed", {
      status: res.status,
      detail: detail.slice(0, 160),
    });
  }
}
