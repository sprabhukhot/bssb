import { getAvatar } from "@/lib/avatars";

export type FormFieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "dropdown"
  | "single_choice"
  | "multi_choice"
  | "image_choice"
  | "checkbox"
  | "phone"
  | "email";

export type ChoiceOption = {
  id: string;
  label: string;
  /** Uploaded image public URL */
  imageUrl?: string;
  /** Built-in fun avatar id from FUN_AVATARS */
  avatarId?: string;
};

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  helpText?: string;
  /** Legacy string options (dropdown) — normalized into choices */
  options?: string[];
  choices?: ChoiceOption[];
  min?: number;
  max?: number;
};

export const FORM_FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "dropdown", label: "Dropdown" },
  { value: "single_choice", label: "Multiple choice (one answer)" },
  { value: "multi_choice", label: "Checkboxes (many answers)" },
  { value: "image_choice", label: "Image / avatar choice" },
  { value: "checkbox", label: "Single checkbox" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
];

export const CHOICE_FIELD_TYPES: FormFieldType[] = [
  "dropdown",
  "single_choice",
  "multi_choice",
  "image_choice",
];

export function isChoiceFieldType(type: FormFieldType): boolean {
  return CHOICE_FIELD_TYPES.includes(type);
}

/** Used so confirmation email can find a recipient. */
export function defaultEmailField(): FormField {
  return {
    id: "email",
    type: "email",
    label: "Email",
    required: true,
    helpText: "Required for a registration confirmation.",
  };
}

/** Email-type field, or a field whose id/label looks like email. */
export function formHasEmailField(fields: FormField[]): boolean {
  return fields.some(
    (f) =>
      f.type === "email" ||
      /e-?mail/i.test(f.id) ||
      /e-?mail/i.test(f.label),
  );
}

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
    defaultEmailField(),
  ];
}

export function newFieldId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}

export function newChoice(
  label = "Option",
  extras?: Partial<ChoiceOption>,
): ChoiceOption {
  return {
    id: newFieldId(),
    label,
    ...extras,
  };
}

function normalizeChoices(row: Record<string, unknown>): ChoiceOption[] {
  if (Array.isArray(row.choices)) {
    return row.choices
      .map((raw) => {
        if (!raw || typeof raw !== "object") return null;
        const c = raw as Record<string, unknown>;
        const id = String(c.id ?? "").trim() || newFieldId();
        const label = String(c.label ?? "").trim() || "Option";
        const choice: ChoiceOption = { id, label };
        if (typeof c.imageUrl === "string" && c.imageUrl.trim()) {
          choice.imageUrl = c.imageUrl.trim();
        }
        if (typeof c.avatarId === "string" && c.avatarId.trim()) {
          choice.avatarId = c.avatarId.trim();
        }
        return choice;
      })
      .filter((c): c is ChoiceOption => Boolean(c));
  }
  if (Array.isArray(row.options)) {
    return row.options
      .map((o) => String(o ?? "").trim())
      .filter(Boolean)
      .map((label) => newChoice(label));
  }
  return [];
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
    let type = String(row.type ?? "") as FormFieldType;
    // Backward compat aliases
    if ((type as string) === "radio") type = "single_choice";
    if ((type as string) === "checkbox_group") type = "multi_choice";
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
    if (isChoiceFieldType(type)) {
      const choices = normalizeChoices(row);
      field.choices = choices.length
        ? choices
        : [newChoice("Option 1"), newChoice("Option 2")];
      // Keep string options for legacy dropdown consumers
      field.options = field.choices.map((c) => c.label);
    }
    if (type === "number") {
      if (typeof row.min === "number") field.min = row.min;
      if (typeof row.max === "number") field.max = row.max;
    }
    fields.push(field);
  }
  return fields.length ? fields : defaultFormFields();
}

export function validateFormFieldsConfig(fields: FormField[]): string | null {
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
    if (isChoiceFieldType(f.type)) {
      const choices = f.choices ?? [];
      if (choices.length < 1) {
        return `“${f.label}” needs at least one option.`;
      }
      if (f.type === "image_choice") {
        const missing = choices.some((c) => !c.imageUrl && !c.avatarId);
        if (missing) {
          return `Image/avatar choice “${f.label}” needs an image or avatar on every option.`;
        }
      }
    }
  }
  return null;
}

export type AnswerValue = string | number | boolean | string[];
export type AnswersMap = Record<string, AnswerValue>;

export function choiceLabel(
  field: FormField,
  choiceIdOrLabel: string,
): string {
  const choices = field.choices ?? [];
  const byId = choices.find((c) => c.id === choiceIdOrLabel);
  if (byId) {
    const avatar = getAvatar(byId.avatarId);
    return avatar ? `${avatar.emoji} ${byId.label}` : byId.label;
  }
  return choiceIdOrLabel;
}

export function answerDisplayValue(
  value: unknown,
  field?: FormField,
): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) {
    return value
      .map((v) =>
        field ? choiceLabel(field, String(v)) : String(v),
      )
      .join("; ");
  }
  if (field && isChoiceFieldType(field.type)) {
    return choiceLabel(field, String(value));
  }
  return String(value);
}

export function emptyChoicesForType(type: FormFieldType): ChoiceOption[] {
  if (type === "image_choice") {
    return [
      newChoice("Lotus", { avatarId: "lotus" }),
      newChoice("Diya", { avatarId: "diya" }),
      newChoice("Peacock", { avatarId: "peacock" }),
    ];
  }
  if (isChoiceFieldType(type)) {
    return [newChoice("Option 1"), newChoice("Option 2")];
  }
  return [];
}
