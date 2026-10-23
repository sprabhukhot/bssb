"use client";

import { useState } from "react";

/**
 * Mobile-friendly quantity control: native <select> for common ranges,
 * or large tap targets (+/−) when the range is wide.
 */
export function QuantityField({
  name,
  label,
  hint,
  min = 0,
  max = 50,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  hint?: string;
  min?: number;
  max?: number;
  defaultValue?: number;
  required?: boolean;
}) {
  const lo = Number.isFinite(min) ? min! : 0;
  const hi = Number.isFinite(max) ? Math.max(max!, lo) : lo + 50;
  const span = hi - lo;
  const initial =
    defaultValue != null && defaultValue >= lo && defaultValue <= hi
      ? defaultValue
      : required
        ? lo
        : lo;

  if (span <= 100) {
    const options: number[] = [];
    for (let n = lo; n <= hi; n++) options.push(n);
    return (
      <label className="field">
        <span>
          {label}
          {required ? "" : " (optional)"}
        </span>
        {hint ? <small className="hint">{hint}</small> : null}
        <select
          name={name}
          required={required}
          defaultValue={String(initial)}
          className="qty-select"
        >
          {options.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <StepperField
      name={name}
      label={label}
      hint={hint}
      min={lo}
      max={hi}
      initial={initial}
      required={required}
    />
  );
}

function StepperField({
  name,
  label,
  hint,
  min,
  max,
  initial,
  required,
}: {
  name: string;
  label: string;
  hint?: string;
  min: number;
  max: number;
  initial: number;
  required?: boolean;
}) {
  const [value, setValue] = useState(initial);

  return (
    <label className="field">
      <span>
        {label}
        {required ? "" : " (optional)"}
      </span>
      {hint ? <small className="hint">{hint}</small> : null}
      <div className="qty-stepper">
        <button
          type="button"
          className="qty-stepper__btn"
          aria-label="Decrease"
          onClick={() => setValue((v) => Math.max(min, v - 1))}
        >
          −
        </button>
        <input type="hidden" name={name} value={value} />
        <span className="qty-stepper__value" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          className="qty-stepper__btn"
          aria-label="Increase"
          onClick={() => setValue((v) => Math.min(max, v + 1))}
        >
          +
        </button>
      </div>
    </label>
  );
}
