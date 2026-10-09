"use client";

import { useState } from "react";
import { slugify, toLocalInputValue } from "@/lib/utils";
import {
  DEFAULT_MAX_ADULTS,
  DEFAULT_MAX_CHILDREN,
  type EventRow,
} from "@/lib/types";

type Props = {
  event?: EventRow;
  action: (
    formData: FormData,
  ) => Promise<{ error?: string; success?: boolean } | void>;
  submitLabel: string;
};

export function EventForm({ event, action, submitLabel }: Props) {
  const [slug, setSlug] = useState(event?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(event));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSaved(false);
    const result = await action(formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result?.success) setSaved(true);
  }

  const defaultMaxAdults =
    event?.max_adults ?? (event ? "" : DEFAULT_MAX_ADULTS);
  const defaultMaxChildren =
    event?.max_children ?? (event ? "" : DEFAULT_MAX_CHILDREN);

  return (
    <form action={onSubmit} className="stack-form">
      <label className="field">
        <span>Title</span>
        <input
          name="title"
          required
          defaultValue={event?.title ?? ""}
          onChange={(e) => {
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder="Brno Navratri Utsav 2026"
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
          placeholder="navratri-2026"
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
          placeholder="Cultural Center Líšeň - Dělňák"
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
          Headcount is flexible — leave blank if there is no fixed venue target.
        </small>
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Max adults / registration</span>
          <input
            type="number"
            name="max_adults"
            min={1}
            defaultValue={defaultMaxAdults}
            placeholder={`e.g. ${DEFAULT_MAX_ADULTS}`}
          />
          <small className="hint">
            Navratri default {DEFAULT_MAX_ADULTS}. Blank = no fixed max.
          </small>
        </label>
        <label className="field">
          <span>Max children / registration</span>
          <input
            type="number"
            name="max_children"
            min={0}
            defaultValue={defaultMaxChildren}
            placeholder={`e.g. ${DEFAULT_MAX_CHILDREN}`}
          />
          <small className="hint">
            Navratri default {DEFAULT_MAX_CHILDREN}. Blank = no fixed max.
          </small>
        </label>
      </div>

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
