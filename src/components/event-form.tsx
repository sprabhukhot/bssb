"use client";

import { useEffect, useMemo, useState } from "react";
import { FormFieldBuilder } from "@/components/form-field-builder";
import {
  defaultFormFields,
  parseFormFieldsJson,
  type FormField,
} from "@/lib/form-fields";
import {
  DEFAULT_EVENT_TIMEZONE,
  MAX_IMAGE_BYTES,
  type EventRow,
} from "@/lib/types";
import {
  detectBrowserTimeZone,
  slugify,
  toZonedInputValue,
} from "@/lib/utils";

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
  const [timezone, setTimezone] = useState(
    event?.timezone || DEFAULT_EVENT_TIMEZONE,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removePoster, setRemovePoster] = useState(false);
  const [removeDonation, setRemoveDonation] = useState(false);

  useEffect(() => {
    if (!event?.timezone) {
      setTimezone(detectBrowserTimeZone());
    }
  }, [event?.timezone]);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSaved(false);
    formData.set("form_fields_json", JSON.stringify(fields));
    formData.set("timezone", timezone);
    if (removePoster) formData.set("remove_poster", "1");
    if (removeDonation) formData.set("remove_donation_image", "1");
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
      <input type="hidden" name="timezone" value={timezone} />

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

      <label className="field">
        <span>Timezone</span>
        <input
          name="timezone_display"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value.trim() || DEFAULT_EVENT_TIMEZONE)}
          placeholder={DEFAULT_EVENT_TIMEZONE}
        />
        <small className="hint">
          Times below are in this zone (default {DEFAULT_EVENT_TIMEZONE} for
          Brno). Detected from your browser when creating a new event.
        </small>
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Starts</span>
          <input
            type="datetime-local"
            name="starts_at"
            required
            defaultValue={toZonedInputValue(event?.starts_at, timezone)}
          />
        </label>
        <label className="field">
          <span>Ends (optional)</span>
          <input
            type="datetime-local"
            name="ends_at"
            defaultValue={toZonedInputValue(event?.ends_at, timezone)}
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
          inputMode="numeric"
        />
        <small className="hint">
          Counts people from adults/children answers when present; otherwise each
          form counts as 1.
        </small>
      </label>

      <div className="image-content-block">
        <p className="form-section__title" style={{ margin: 0 }}>
          Event poster
        </p>
        <label className="field">
          <span>Poster image (optional)</span>
          <input
            type="file"
            name="poster"
            accept="image/jpeg,image/png,image/webp"
          />
          <small className="hint">
            JPG, PNG, or WebP · max{" "}
            {Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}
            MB. Shown at the top of the public page.
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
        <label className="field">
          <span>Poster heading (optional)</span>
          <input
            name="poster_heading"
            defaultValue={event?.poster_heading ?? ""}
            placeholder="Shown next to the poster"
          />
        </label>
        <label className="field">
          <span>Poster body (optional)</span>
          <textarea
            name="poster_body"
            rows={3}
            defaultValue={event?.poster_body ?? ""}
            placeholder="Caption or details next to the poster image"
          />
        </label>
      </div>

      <div className="image-content-block">
        <p className="form-section__title" style={{ margin: 0 }}>
          Donation / payment image
        </p>
        <label className="field">
          <span>Donation image (optional)</span>
          <input
            type="file"
            name="donation_image"
            accept="image/jpeg,image/png,image/webp"
          />
          <small className="hint">
            QR code or bank details image for guests (separate from the poster).
            Same size limits.
          </small>
        </label>
        {event?.donation_image_url && !removeDonation ? (
          <div className="poster-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.donation_image_url} alt="Current donation image" />
            <label className="check-field">
              <input
                type="checkbox"
                checked={removeDonation}
                onChange={(e) => setRemoveDonation(e.target.checked)}
              />
              <span>Remove donation image</span>
            </label>
          </div>
        ) : null}
        <label className="field">
          <span>Donation heading (optional)</span>
          <input
            name="donation_heading"
            defaultValue={event?.donation_heading ?? ""}
            placeholder="Payment / donation"
          />
        </label>
        <label className="field">
          <span>Donation body (optional)</span>
          <textarea
            name="donation_body"
            rows={3}
            defaultValue={event?.donation_body ?? ""}
            placeholder="Instructions shown next to the QR or payment image"
          />
        </label>
      </div>

      <FormFieldBuilder fields={fields} onChange={setFields} />
      <input
        type="hidden"
        name="form_fields_json"
        value={JSON.stringify(fields)}
        readOnly
      />

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
