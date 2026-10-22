export type FormFieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "dropdown"
  | "checkbox"
  | "phone"
  | "email";

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  helpText?: string;
  options?: string[];
  min?: number;
  max?: number;
};

export const FORM_FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
];

/** Sensible starter for new events — organizers can change freely. */
export function defaultFormFields(): FormField[] {
  return [
    {
      id: "full_name",
      type: "short_text",
      label: "Your name",
      required: true,
    },
    {
      id: "phone",
      type: "phone",
      label: "Contact number",
      required: true,
      helpText: "Required — one registration per phone.",
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      required: false,
      helpText: "Optional",
    },
  ];
}

/** Match the previous hardcoded Navratri form (for migrating existing events). */
export function legacyNavratriFormFields(): FormField[] {
  return [
    {
      id: "full_name",
      type: "short_text",
      label: "Your name",
      required: true,
    },
    {
      id: "phone",
      type: "phone",
      label: "Contact number",
      required: true,
      helpText: "Required — one registration per phone.",
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      required: false,
      helpText: "Optional",
    },
    {
      id: "adults_count",
      type: "number",
      label: "Adults (over 10 years)",
      required: true,
      min: 1,
      max: 10,
      helpText: "1–10",
    },
    {
      id: "children_count",
      type: "number",
      label: "Children (under 10)",
      required: true,
      min: 0,
      max: 5,
      helpText: "0–5",
    },
    {
      id: "dandiya_sets",
      type: "number",
      label: "Dandiya sets",
      required: true,
      min: 0,
      max: 50,
    },
    {
      id: "samosas",
      type: "number",
      label: "Samosas",
      required: true,
      min: 0,
      max: 50,
    },
    {
      id: "kachoris",
      type: "number",
      label: "Kachoris",
      required: true,
      min: 0,
      max: 50,
    },
    {
      id: "teas",
      type: "number",
      label: "Tea / chai",
      required: true,
      min: 0,
      max: 50,
    },
    {
      id: "jalebis",
      type: "number",
      label: "Jalebi plates",
      required: true,
      min: 0,
      max: 50,
    },
    {
      id: "comments",
      type: "long_text",
      label: "Comments",
      required: false,
    },
    {
      id: "payment_acknowledged",
      type: "checkbox",
      label:
        "I understand registration is valid only after payment is received.",
      required: true,
    },
    {
      id: "data_consent",
      type: "checkbox",
      label:
        "I consent to BSSB processing my personal data for this and related event communication.",
      required: true,
    },
  ];
}

export function newFieldId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}

export function parseFormFieldsJson(raw: unknown): FormField[] {
  if (typeof raw === "string") {
    try {
      return normalizeFormFields(JSON.parse(raw));
    } catch {
      return defaultFormFields();
    }
  }
  return normalizeFormFields(raw);
}

export function normalizeFormFields(raw: unknown): FormField[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultFormFields();
  const fields: FormField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const type = String(row.type ?? "") as FormFieldType;
    if (!FORM_FIELD_TYPES.some((t) => t.value === type)) continue;
    const id = String(row.id ?? "").trim() || newFieldId();
    const label = String(row.label ?? "").trim() || "Untitled field";
    const field: FormField = {
      id,
      type,
      label,
      required: Boolean(row.required),
    };
    if (typeof row.helpText === "string" && row.helpText.trim()) {
      field.helpText = row.helpText.trim();
    }
    if (type === "dropdown" && Array.isArray(row.options)) {
      field.options = row.options
        .map((o) => String(o ?? "").trim())
        .filter(Boolean);
    }
    if (type === "number") {
      if (typeof row.min === "number") field.min = row.min;
      if (typeof row.max === "number") field.max = row.max;
    }
    fields.push(field);
  }
  return fields.length ? fields : defaultFormFields();
}

export function validateFormFieldsConfig(
  fields: FormField[],
): string | null {
  if (!fields.length) return "Add at least one registration field.";
  if (!fields.some((f) => f.type === "phone")) {
    return "Include a phone field (used for one registration per contact number).";
  }
  if (!fields.some((f) => f.type === "short_text" || f.id === "full_name")) {
    return "Include a short text field for the participant name.";
  }
  const ids = new Set<string>();
  for (const f of fields) {
    if (ids.has(f.id)) return `Duplicate field id: ${f.id}`;
    ids.add(f.id);
    if (f.type === "dropdown" && (!f.options || f.options.length < 1)) {
      return `Dropdown “${f.label}” needs at least one option.`;
    }
  }
  return null;
}

export type AnswersMap = Record<string, string | number | boolean>;

export function answerDisplayValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}
