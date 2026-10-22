"use client";

import {
  FORM_FIELD_TYPES,
  defaultFormFields,
  newFieldId,
  type FormField,
  type FormFieldType,
} from "@/lib/form-fields";

type Props = {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
};

export function FormFieldBuilder({ fields, onChange }: Props) {
  function updateAt(index: number, patch: Partial<FormField>) {
    const next = fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next);
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(index, 1);
    next.splice(j, 0, item);
    onChange(next);
  }

  function remove(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function addField(type: FormFieldType = "short_text") {
    const id =
      type === "phone" && !fields.some((f) => f.id === "phone")
        ? "phone"
        : type === "email" && !fields.some((f) => f.id === "email")
          ? "email"
          : newFieldId();
    const field: FormField = {
      id,
      type,
      label:
        type === "phone"
          ? "Contact number"
          : type === "email"
            ? "Email"
            : "New question",
      required: type === "phone" || type === "short_text",
      ...(type === "dropdown" ? { options: ["Option 1", "Option 2"] } : {}),
      ...(type === "number" ? { min: 0, max: 100 } : {}),
    };
    onChange([...fields, field]);
  }

  return (
    <div className="form-builder">
      <div className="form-builder__head">
        <div>
          <p className="form-section__title" style={{ margin: 0 }}>
            Registration form
          </p>
          <small className="hint">
            Guests only see these fields. Include a phone field (unique per
            event). Reset restores name + phone + optional email.
          </small>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => onChange(defaultFormFields())}
        >
          Reset to default
        </button>
      </div>

      <ul className="form-builder__list">
        {fields.map((field, index) => (
          <li key={field.id} className="form-builder__item">
            <div className="field-grid">
              <label className="field">
                <span>Label</span>
                <input
                  value={field.label}
                  onChange={(e) => updateAt(index, { label: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Type</span>
                <select
                  value={field.type}
                  onChange={(e) => {
                    const type = e.target.value as FormFieldType;
                    const patch: Partial<FormField> = { type };
                    if (type === "dropdown" && !field.options?.length) {
                      patch.options = ["Option 1", "Option 2"];
                    }
                    if (type !== "dropdown") patch.options = undefined;
                    if (type !== "number") {
                      patch.min = undefined;
                      patch.max = undefined;
                    } else if (field.min == null) {
                      patch.min = 0;
                      patch.max = 100;
                    }
                    updateAt(index, patch);
                  }}
                >
                  {FORM_FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Help text (optional)</span>
              <input
                value={field.helpText ?? ""}
                onChange={(e) =>
                  updateAt(index, {
                    helpText: e.target.value || undefined,
                  })
                }
              />
            </label>

            {field.type === "dropdown" ? (
              <label className="field">
                <span>Options (one per line)</span>
                <textarea
                  rows={3}
                  value={(field.options ?? []).join("\n")}
                  onChange={(e) =>
                    updateAt(index, {
                      options: e.target.value
                        .split("\n")
                        .map((o) => o.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
            ) : null}

            {field.type === "number" ? (
              <div className="field-grid">
                <label className="field">
                  <span>Min</span>
                  <input
                    type="number"
                    value={field.min ?? ""}
                    onChange={(e) =>
                      updateAt(index, {
                        min:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>Max</span>
                  <input
                    type="number"
                    value={field.max ?? ""}
                    onChange={(e) =>
                      updateAt(index, {
                        max:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
            ) : null}

            <div className="form-builder__item-actions">
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) =>
                    updateAt(index, { required: e.target.checked })
                  }
                />
                <span>Required</span>
              </label>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => move(index, 1)}
                  disabled={index === fields.length - 1}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => remove(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => addField("short_text")}
      >
        Add field
      </button>
    </div>
  );
}
