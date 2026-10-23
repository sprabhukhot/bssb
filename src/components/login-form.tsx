"use client";

import { useState } from "react";
import {
  sendMagicLink,
  signInWithPassword,
  verifyEmailOtp,
} from "@/lib/actions/auth";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");

  async function onPasswordSignIn(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await signInWithPassword(formData);
    setPending(false);
    if (result?.error) setError(result.error);
  }

  async function onSendLink(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await sendMagicLink(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      setShowOtp(true);
      return;
    }
    setShowOtp(true);
    setMessage(result.message ?? "Check your email.");
    if (result.email) setEmail(result.email);
  }

  async function onVerifyOtp(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await verifyEmailOtp(formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      setShowOtp(true);
    }
  }

  return (
    <div className="stack-form">
      <form action={onPasswordSignIn} className="stack-form">
        <input type="hidden" name="next" value={nextPath} />
        <label className="field">
          <span>Organizer email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-success">{message}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          Magic link / email code
        </summary>
        <form action={onSendLink} className="stack-form" style={{ marginTop: 12 }}>
          <input type="hidden" name="next" value={nextPath} />
          <input type="hidden" name="email" value={email} />
          <button
            className="btn btn-ghost"
            type="submit"
            disabled={pending || !email}
          >
            {pending ? "Sending…" : "Email me a magic link"}
          </button>
        </form>

        {showOtp ? (
          <form action={onVerifyOtp} className="stack-form" style={{ marginTop: 12 }}>
            <input type="hidden" name="next" value={nextPath} />
            <input type="hidden" name="email" value={email} />
            <label className="field">
              <span>6-digit code from the email</span>
              <input
                name="token"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                maxLength={10}
                required
                placeholder="123456"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
              />
            </label>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={pending || !email}
            >
              {pending ? "Verifying…" : "Verify code and sign in"}
            </button>
          </form>
        ) : null}
      </details>
    </div>
  );
}
