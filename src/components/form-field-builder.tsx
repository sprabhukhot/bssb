"use client";

import {
  FORM_FIELD_TYPES,
  defaultEmailField,
  defaultFormFields,
  emptyChoicesForType,
  formHasEmailField,
  isChoiceFieldType,
  newChoice,
  newFieldId,
  type ChoiceOption,
  type FormField,
  type FormFieldType,
} from "@/lib/form-fields";
import { FUN_AVATARS } from "@/lib/avatars";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "@/lib/types";

type Props = {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
};

export function FormFieldBuilder({ fields, onChange }: Props) {
  function updateAt(index: number, patch: Partial<FormField>) {
    const next = fields.map((f, i) => {
      if (i !== index) return f;
      const merged = { ...f, ...patch };
      if (merged.choices) {
        merged.options = merged.choices.map((c) => c.label);
      }
      return merged;
    });
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
    if (type === "email") {
      const starter = defaultEmailField();
      const field: FormField = fields.some((f) => f.id === "email")
        ? { ...starter, id: newFieldId() }
        : starter;
      onChange([...fields, field]);
      return;
    }
    const id =
      type === "phone" && !fields.some((f) => f.id === "phone")
        ? "phone"
        : newFieldId();
    const field: FormField = {
      id,
      type,
      label:
        type === "phone"
          ? "Contact number"
          : type === "image_choice"
            ? "Pick your avatar"
            : "New question",
      required: type === "phone" || type === "short_text",
      ...(isChoiceFieldType(type)
        ? { choices: emptyChoicesForType(type) }
        : {}),
      ...(type === "number" ? { min: 0, max: 100 } : {}),
    };
    onChange([...fields, field]);
  }

  const missingEmail = !formHasEmailField(fields);

  return (
    <div className="form-builder">
      <div className="form-builder__head">
        <p className="form-section__title" style={{ margin: 0 }}>
          Registration form
        </p>
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
                    if (isChoiceFieldType(type)) {
                      patch.choices =
                        field.choices?.length
                          ? field.choices
                          : emptyChoicesForType(type);
                    } else {
                      patch.choices = undefined;
                      patch.options = undefined;
                    }
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

            {isChoiceFieldType(field.type) ? (
              <ChoiceOptionsEditor
                field={field}
                onChange={(choices) => updateAt(index, { choices })}
              />
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

      {missingEmail ? (
        <p className="notice notice-privacy">
          This form has no email field, so confirmation emails cannot be sent.
          Existing registrations stay as they are until you save an email field.
        </p>
      ) : null}

      <div className="form-builder__add-row">
        {missingEmail ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => addField("email")}
          >
            Add required email
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => addField("short_text")}
        >
          Add field
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => addField("image_choice")}
        >
          Add image / avatar choice
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => addField("single_choice")}
        >
          Add multiple choice
        </button>
      </div>
    </div>
  );
}

function ChoiceOptionsEditor({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (choices: ChoiceOption[]) => void;
}) {
  const choices = field.choices ?? [];
  const isImage = field.type === "image_choice";

  function updateChoice(i: number, patch: Partial<ChoiceOption>) {
    onChange(choices.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function removeChoice(i: number) {
    onChange(choices.filter((_, idx) => idx !== i));
  }

  async function uploadOptionImage(i: number, file: File | null) {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      alert("Image must be 2 MB or smaller.");
      return;
    }
    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      alert("Use JPG, PNG, or WebP.");
      return;
    }
    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
    const path = `choices/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("event-posters")
      .upload(path, file, { contentType: file.type, upsert: true });
    if (error) {
      alert(
        `Upload failed: ${error.message}. Confirm Storage bucket event-posters allows organizer uploads.`,
      );
      return;
    }
    const { data } = supabase.storage.from("event-posters").getPublicUrl(path);
    updateChoice(i, { imageUrl: data.publicUrl, avatarId: undefined });
  }

  return (
    <div className="choice-editor">
      <p className="choice-editor__title">
        {isImage ? "Image / avatar options" : "Options"}
      </p>
      <ul className="choice-editor__list">
        {choices.map((choice, i) => (
          <li key={choice.id} className="choice-editor__item">
            <label className="field">
              <span>Label</span>
              <input
                value={choice.label}
                onChange={(e) => updateChoice(i, { label: e.target.value })}
              />
            </label>

            {isImage ? (
              <div className="choice-editor__media">
                <div className="choice-editor__preview">
                  {choice.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={choice.imageUrl} alt="" />
                  ) : choice.avatarId ? (
                    <span className="avatar-chip avatar-chip--preview" data-avatar={choice.avatarId}>
                      {FUN_AVATARS.find((a) => a.id === choice.avatarId)?.emoji ??
                        "?"}
                    </span>
                  ) : (
                    <span className="muted">No image yet</span>
                  )}
                </div>
                <label className="field">
                  <span>Built-in avatar</span>
                  <select
                    value={choice.avatarId ?? ""}
                    onChange={(e) => {
                      const avatarId = e.target.value || undefined;
                      updateChoice(i, {
                        avatarId,
                        imageUrl: avatarId ? undefined : choice.imageUrl,
                      });
                    }}
                  >
                    <option value="">— Custom upload —</option>
                    {FUN_AVATARS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.emoji} {a.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Or upload image</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                      void uploadOptionImage(i, e.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>
            ) : null}

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => removeChoice(i)}
              disabled={choices.length <= 1}
            >
              Remove option
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() =>
          onChange([
            ...choices,
            isImage
              ? newChoice("New option", { avatarId: "star" })
              : newChoice("New option"),
          ])
        }
      >
        Add option
      </button>
    </div>
  );
}
