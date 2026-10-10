"use client";

import { useState } from "react";
import { updateSiteContent } from "@/lib/actions/site-content";
import type { SiteContent } from "@/lib/site-content";

export function SiteContentForm({ initial }: { initial: SiteContent }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await updateSiteContent(formData);
    setPending(false);
    if (result.error) setError(result.error);
    else setMessage(result.message ?? "Saved.");
  }

  return (
    <form action={onSubmit} className="stack-form">
      <label className="field">
        <span>Header subtitle</span>
        <input name="subtitle" defaultValue={initial.subtitle} required />
      </label>
      <label className="field">
        <span>Hero headline</span>
        <input
          name="hero_headline"
          defaultValue={initial.hero_headline}
          required
        />
      </label>
      <label className="field">
        <span>Hero text</span>
        <textarea
          name="hero_body"
          rows={3}
          defaultValue={initial.hero_body}
          required
        />
      </label>
      <label className="field">
        <span>About title</span>
        <input name="about_title" defaultValue={initial.about_title} required />
      </label>
      <label className="field">
        <span>About text</span>
        <textarea
          name="about_body"
          rows={4}
          defaultValue={initial.about_body}
          required
        />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Pillar 1 title</span>
          <input
            name="pillar_1_title"
            defaultValue={initial.pillar_1_title}
            required
          />
        </label>
        <label className="field">
          <span>Pillar 1 text</span>
          <input
            name="pillar_1_body"
            defaultValue={initial.pillar_1_body}
            required
          />
        </label>
        <label className="field">
          <span>Pillar 2 title</span>
          <input
            name="pillar_2_title"
            defaultValue={initial.pillar_2_title}
            required
          />
        </label>
        <label className="field">
          <span>Pillar 2 text</span>
          <input
            name="pillar_2_body"
            defaultValue={initial.pillar_2_body}
            required
          />
        </label>
        <label className="field">
          <span>Pillar 3 title</span>
          <input
            name="pillar_3_title"
            defaultValue={initial.pillar_3_title}
            required
          />
        </label>
        <label className="field">
          <span>Pillar 3 text</span>
          <input
            name="pillar_3_body"
            defaultValue={initial.pillar_3_body}
            required
          />
        </label>
      </div>
      <label className="field">
        <span>Footer text</span>
        <input name="footer_text" defaultValue={initial.footer_text} required />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save homepage"}
      </button>
    </form>
  );
}
