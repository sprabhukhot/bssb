"use client";

import { useState } from "react";
import { QuantityField } from "@/components/quantity-field";
import { registerForEvent } from "@/lib/actions/registrations";
import type { FormField } from "@/lib/form-fields";

export function RegisterForm({
  eventId,
  fields,
  disabled,
  disabledReason,
}: {
  eventId: string;
  fields: FormField[];
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await registerForEvent(eventId, formData);
    setPending(false);
    if (result?.error) setError(result.error);
  }

  if (disabled) {
    return <p className="notice notice-warn">{disabledReason}</p>;
  }

  return (
    <form action={onSubmit} className="stack-form register-form">
      {fields.map((field) => (
        <DynamicField key={field.id} field={field} />
      ))}

      {error ? <p className="form-error">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Register"}
      </button>
    </form>
  );
}

function DynamicField({ field }: { field: FormField }) {
  const name = `field_${field.id}`;

  if (field.type === "checkbox") {
    return (
      <label className="check-field">
        <input type="checkbox" name={name} required={field.required} />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <QuantityField
        name={name}
        label={field.label}
        hint={field.helpText}
        min={field.min ?? 0}
        max={field.max ?? 50}
        defaultValue={field.required ? (field.min ?? 0) : field.min ?? 0}
        required={field.required}
      />
    );
  }

  const label = (
    <>
      <span>
        {field.label}
        {field.required ? "" : " (optional)"}
      </span>
      {field.helpText ? <small className="hint">{field.helpText}</small> : null}
    </>
  );

  if (field.type === "long_text") {
    return (
      <label className="field">
        {label}
        <textarea name={name} rows={3} required={field.required} />
      </label>
    );
  }

  if (field.type === "dropdown") {
    return (
      <label className="field">
        {label}
        <select name={name} required={field.required} defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const inputType =
    field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text";

  return (
    <label className="field">
      {label}
      <input
        type={inputType}
        name={name}
        required={field.required}
        autoComplete={
          field.type === "email"
            ? "email"
            : field.type === "phone"
              ? "tel"
              : field.id === "full_name"
                ? "name"
                : undefined
        }
      />
    </label>
  );
}
