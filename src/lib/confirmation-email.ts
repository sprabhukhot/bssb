import "server-only";

import type { AnswersMap, FormField } from "@/lib/form-fields";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const DONATE_URL = "https://bssb.cz/donate";
/**
 * Resend test sender. Can only deliver to the Resend account owner’s email
 * until a custom domain is verified and `RESEND_FROM` uses that domain.
 */
export const DEFAULT_RESEND_FROM = "BSSB Events <beth.t@example.com>";

/** Safe query values for `/thanks?mail=` — never include secrets or API text. */
export type MailReason =
  | "sent"
  | "no_address"
  | "missing_key"
  | "restricted"
  | "invalid_from"
  | "invalid_to"
  | "failed";

export type ConfirmEmailResult = {
  status: "sent" | "skipped" | "failed";
  reason: MailReason;
};

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return "";
  if (Array.isArray(value)) return value.map(String).join(" ");
  return String(value).trim();
}

function asEmail(value: unknown): string | null {
  const v = asText(value).toLowerCase();
  return EMAIL_RE.test(v) ? v : null;
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
      (f.type === "short_text" || f.type === "long_text") &&
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
  const typed = fields.filter((f) => f.type === "email");
  for (const field of typed) {
    const v = asEmail(answers[field.id]);
    if (v) return v;
  }

  const labeled = fields.filter((f) => fieldMatches(f, /e-?mail/i));
  for (const field of labeled) {
    const v = asEmail(answers[field.id]);
    if (v) return v;
  }

  const fromKey = asEmail(answers.email);
  if (fromKey) return fromKey;

  for (const field of fields) {
    const v = asEmail(answers[field.id]);
    if (v) return v;
  }
  for (const value of Object.values(answers)) {
    const v = asEmail(value);
    if (v) return v;
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
  return countFromFields(
    answers,
    fields,
    /\badult/i,
    ["adults_count", "adults", "adult"],
  );
}

export function childCount(answers: AnswersMap, fields: FormField[]): number {
  return countFromFields(
    answers,
    fields,
    /\b(kid|kids|child|children)\b/i,
    ["children_count", "kids_count", "children", "kids", "child"],
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

/** Dynamic lookup so Next/Turbopack cannot inline the secret at build time. */
function readServerEnv(name: string): string | undefined {
  return process.env[name];
}

function resendErrorText(body: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    // plain text body
  }
  return body;
}

function redactEmails(value: string): string {
  return value.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/gi, "[email]");
}

/** Map Resend HTTP bodies to a short public reason (no secrets). */
export function classifyResendFailure(status: number, body: string): MailReason {
  const text = resendErrorText(body).toLowerCase();
  if (
    text.includes("only send testing emails") ||
    text.includes("only send testing email") ||
    (text.includes("own email") && text.includes("verify a domain"))
  ) {
    return "restricted";
  }
  if (
    text.includes("invalid `to`") ||
    text.includes("invalid to") ||
    text.includes("invalid recipient")
  ) {
    return "invalid_to";
  }
  if (
    text.includes("domain is not verified") ||
    text.includes("invalid `from`") ||
    text.includes("invalid from") ||
    (status === 403 && text.includes("not verified"))
  ) {
    return "invalid_from";
  }
  if (
    status === 401 ||
    text.includes("api key is invalid") ||
    text.includes("missing api key") ||
    text.includes("unauthorized")
  ) {
    return "missing_key";
  }
  return "failed";
}

export async function sendRegistrationConfirmation(opts: {
  answers: AnswersMap;
  fields: FormField[];
  eventTitle: string;
  donationImageUrl?: string | null;
}): Promise<ConfirmEmailResult> {
  const apiKey = readServerEnv("RESEND_API_KEY")?.trim();
  if (!apiKey) {
    console.info("[confirm-email] skipped", { reason: "missing_key" });
    return { status: "skipped", reason: "missing_key" };
  }

  const to = registrantEmail(opts.answers, opts.fields);
  if (!to) {
    console.info("[confirm-email] skipped", { reason: "no_address" });
    return { status: "skipped", reason: "no_address" };
  }

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

  const customFrom = readServerEnv("RESEND_FROM")?.trim();
  const from = customFrom || DEFAULT_RESEND_FROM;

  try {
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
      const reason = classifyResendFailure(res.status, detail);
      console.info("[confirm-email] failed", {
        reason,
        status: res.status,
        fromHost: from.includes("@") ? from.split("@").pop() : "unknown",
        hasRecipient: true,
        adults,
        kids,
        detail: redactEmails(resendErrorText(detail)).slice(0, 160),
      });
      return { status: "failed", reason };
    }

    console.info("[confirm-email] sent", {
      fromHost: from.includes("@") ? from.split("@").pop() : "unknown",
      usedDefaultFrom: !customFrom,
      adults,
      kids,
    });
    return { status: "sent", reason: "sent" };
  } catch (err) {
    console.info("[confirm-email] failed", {
      reason: "failed",
      message: err instanceof Error ? err.message.slice(0, 120) : "unknown",
    });
    return { status: "failed", reason: "failed" };
  }
}
