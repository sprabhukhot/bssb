"use client";

import { useMemo, useState } from "react";
import { FormFieldBuilder } from "@/components/form-field-builder";
import {
  defaultFormFields,
  parseFormFieldsJson,
  type FormField,
} from "@/lib/form-fields";
import { MAX_POSTER_BYTES, type EventRow } from "@/lib/types";
import { slugify, toLocalInputValue } from "@/lib/utils";

type Props = {
  event?: EventRow;
  action: (
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean } | void>;
  submitLabel: string;
};

export function EventForm({ event, action, submitLabel }: Props) {
  const initialFields = useMemo(
    () =>
      event?.form_fields
        ? parseFormFieldsJson(event.form_fields)
        : defaultFormFields(),
    [event?.form_fields],
  );
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(event));
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removePoster, setRemovePoster] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSaved(false);
    formData.set("form_fields_json", JSON.stringify(fields));
    if (removePoster) formData.set("remove_poster", "1");
    const result = await action(formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.success) setSaved(true);
  }

  return (
    <form action={onSubmit} className="stack-form" encType="multipart/form-data">
      <label className="field">
        <span>Title</span>
        <input
          name="title"
          required
          defaultValue={event?.title ?? ""}
          onChange={(e) => {
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder="Community gathering"
        />
      </label>

      <label className="field">
        <span>Shareable slug</span>
        <input
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          placeholder="spring-gathering"
        />
        <small className="hint">Public link: /e/{slug || "your-slug"}</small>
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={event?.description ?? ""}
          placeholder="What attendees should know"
        />
      </label>

      <label className="field">
        <span>Location</span>
        <input
          name="location"
          defaultValue={event?.location ?? ""}
          placeholder="Venue name"
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Starts</span>
          <input
            type="datetime-local"
            name="starts_at"
            required
            defaultValue={toLocalInputValue(event?.starts_at)}
          />
        </label>
        <label className="field">
          <span>Ends (optional)</span>
          <input
            type="datetime-local"
            name="ends_at"
            defaultValue={toLocalInputValue(event?.ends_at)}
          />
        </label>
      </div>

      <label className="field">
        <span>Total capacity (optional)</span>
        <input
          type="number"
          name="capacity"
          min={1}
          defaultValue={event?.capacity ?? ""}
          placeholder="Blank = unlimited"
        />
        <small className="hint">
          Counts people from adults/children answers when present; otherwise each
          form counts as 1. Leave blank for no limit.
        </small>
      </label>

      <label className="field">
        <span>Event poster (optional)</span>
        <input
          type="file"
          name="poster"
          accept="image/jpeg,image/png,image/webp"
        />
        <small className="hint">
          JPG, PNG, or WebP · max {Math.round(MAX_POSTER_BYTES / (1024 * 1024))}
          MB. Shown on the public registration page.
        </small>
      </label>
      {event?.poster_url && !removePoster ? (
        <div className="poster-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.poster_url} alt="Current poster" />
          <label className="check-field">
            <input
              type="checkbox"
              checked={removePoster}
              onChange={(e) => setRemovePoster(e.target.checked)}
            />
            <span>Remove current poster</span>
          </label>
        </div>
      ) : null}

      <FormFieldBuilder fields={fields} onChange={setFields} />
      <input type="hidden" name="form_fields_json" value={JSON.stringify(fields)} readOnly />

      <label className="check-field">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={event?.is_published ?? false}
        />
        <span>Published (public registration link is live)</span>
      </label>

      {error ? <p className="form-error">{error}</p> : null}
      {saved ? <p className="form-success">Saved.</p> : null}

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
