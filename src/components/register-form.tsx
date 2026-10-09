"use client";

import { useState } from "react";
import { registerForEvent } from "@/lib/actions/registrations";
import { SAFETY_PARTY_CEILING } from "@/lib/types";

function NumberField({
  name,
  label,
  hint,
  min,
  max,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  hint?: string;
  min: number;
  max: number;
  defaultValue: number;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {hint ? <small className="hint">{hint}</small> : null}
      <input
        type="number"
        name={name}
        min={min}
        max={max}
        step={1}
        required={required}
        defaultValue={defaultValue}
      />
    </label>
  );
}

export function RegisterForm({
  eventId,
  disabled,
  disabledReason,
  maxAdults,
  maxChildren,
}: {
  eventId: string;
  disabled?: boolean;
  disabledReason?: string;
  maxAdults?: number | null;
  maxChildren?: number | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const adultsMax = maxAdults ?? SAFETY_PARTY_CEILING;
  const childrenMax = maxChildren ?? SAFETY_PARTY_CEILING;

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
      <label className="field">
        <span>Your name</span>
        <input name="full_name" required autoComplete="name" />
      </label>
      <label className="field">
        <span>Contact number</span>
        <input name="phone" type="tel" required autoComplete="tel" />
        <small className="hint">Required — one registration per phone.</small>
      </label>
      <label className="field">
        <span>Email (optional)</span>
        <input name="email" type="email" autoComplete="email" />
      </label>

      <div className="form-section">
        <p className="form-section__title">Attendance</p>
        <div className="field-grid">
          <NumberField
            name="adults_count"
            label="Adults (over 10 years)"
            hint={`1–${adultsMax}. Entry fee may apply (core members free).`}
            min={1}
            max={adultsMax}
            defaultValue={1}
            required
          />
          <NumberField
            name="children_count"
            label="Children (under 10)"
            hint={`0–${childrenMax}. Free entry — add ages in comments.`}
            min={0}
            max={childrenMax}
            defaultValue={0}
            required
          />
        </div>
      </div>

      <div className="form-section">
        <p className="form-section__title">Optional snacks &amp; dandiya</p>
        <p className="hint" style={{ margin: 0 }}>
          Enter 0 if not needed. No dinner at venue — snacks only if pre-booked.
        </p>
        <div className="field-grid">
          <NumberField
            name="dandiya_sets"
            label="Dandiya sets"
            hint="CZK 50 / set"
            min={0}
            max={50}
            defaultValue={0}
            required
          />
          <NumberField
            name="samosas"
            label="Samosas"
            hint="CZK 50 / piece"
            min={0}
            max={50}
            defaultValue={0}
            required
          />
          <NumberField
            name="kachoris"
            label="Kachoris"
            hint="CZK 50 / piece"
            min={0}
            max={50}
            defaultValue={0}
            required
          />
          <NumberField
            name="teas"
            label="Tea / chai"
            hint="CZK 40 / glass"
            min={0}
            max={50}
            defaultValue={0}
            required
          />
          <NumberField
            name="jalebis"
            label="Jalebi plates"
            hint="CZK 40 / plate"
            min={0}
            max={50}
            defaultValue={0}
            required
          />
        </div>
      </div>

      <label className="field">
        <span>Comments (optional)</span>
        <textarea
          name="comments"
          rows={3}
          placeholder="Child ages, friends you paid for, questions…"
        />
      </label>

      <label className="check-field">
        <input type="checkbox" name="payment_acknowledged" required />
        <span>
          I understand registration is valid only after payment is received.
        </span>
      </label>
      <label className="check-field">
        <input type="checkbox" name="data_consent" required />
        <span>
          I consent to BSSB processing my personal data for this and related
          event communication.
        </span>
      </label>

      {error ? <p className="form-error">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Register"}
      </button>
    </form>
  );
}
