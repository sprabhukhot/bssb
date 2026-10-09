"use client";

import { useState } from "react";
import { sendMagicLink } from "@/lib/actions/auth";

export function LoginForm({
  nextPath,
  initialError,
}: {
  nextPath: string;
  initialError?: string;
}) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await sendMagicLink(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage(result.message ?? "Check your email.");
  }

  return (
    <form action={onSubmit} className="stack-form">
      <input type="hidden" name="next" value={nextPath} />
      <label className="field">
        <span>Organizer email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Email me a magic link"}
      </button>
    </form>
  );
}
