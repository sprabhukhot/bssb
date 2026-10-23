"use client";

import { useState } from "react";
import { QuantityField } from "@/components/quantity-field";
import { getAvatar } from "@/lib/avatars";
import { registerForEvent } from "@/lib/actions/registrations";
import type { ChoiceOption, FormField } from "@/lib/form-fields";

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
  const choices = field.choices ?? [];

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
          {choices.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "single_choice") {
    return (
      <fieldset className="choice-field">
        <legend>{label}</legend>
        <div className="choice-pills">
          {choices.map((opt) => (
            <label key={opt.id} className="choice-pill">
              <input
                type="radio"
                name={name}
                value={opt.id}
                required={field.required}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "multi_choice") {
    return (
      <fieldset className="choice-field">
        <legend>{label}</legend>
        <div className="choice-pills">
          {choices.map((opt) => (
            <label key={opt.id} className="choice-pill">
              <input type="checkbox" name={name} value={opt.id} />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "image_choice") {
    return (
      <fieldset className="choice-field">
        <legend>{label}</legend>
        <div className="avatar-grid" role="radiogroup" aria-label={field.label}>
          {choices.map((opt) => (
            <ImageChoiceOption key={opt.id} name={name} option={opt} required={field.required} />
          ))}
        </div>
      </fieldset>
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

function ImageChoiceOption({
  name,
  option,
  required,
}: {
  name: string;
  option: ChoiceOption;
  required: boolean;
}) {
  const avatar = getAvatar(option.avatarId);
  return (
    <label className="avatar-option">
      <input
        type="radio"
        name={name}
        value={option.id}
        required={required}
      />
      <span className="avatar-option__face">
        {option.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={option.imageUrl} alt="" />
        ) : (
          <span
            className="avatar-chip"
            data-avatar={option.avatarId ?? "star"}
          >
            {avatar?.emoji ?? "⭐"}
          </span>
        )}
      </span>
      <span className="avatar-option__label">{option.label}</span>
    </label>
  );
}
