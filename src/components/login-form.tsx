"use client";

import { useState } from "react";
import {
  sendMagicLink,
  signInWithPassword,
  verifyEmailOtp,
} from "@/lib/actions/auth";
import { requestPasswordReset } from "@/lib/actions/password";
import { isNextRedirectError } from "@/lib/auth-errors";

export function LoginForm({
  nextPath,
  initialError,
  initialMessage,
}: {
  nextPath: string;
  initialError?: string;
  initialMessage?: string;
}) {
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");

  async function onPasswordSignIn(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    setEmail(trimmedEmail);

    formData.set("email", trimmedEmail);
    formData.set("password", password);
    formData.set("next", nextPath);

    try {
      const result = await signInWithPassword(formData);
      if (result?.error) setError(result.error);
    } catch (err) {
      if (isNextRedirectError(err)) throw err;
      const msg =
        err instanceof Error ? err.message : "Sign-in request failed.";
      setError(
        msg.toLowerCase().includes("fetch") ||
          msg.toLowerCase().includes("network")
          ? "Could not reach the server or Supabase. Check Netlify env NEXT_PUBLIC_SUPABASE_URL / ANON_KEY and retry."
          : `Sign-in request failed: ${msg.slice(0, 160)}`,
      );
    } finally {
      setPending(false);
    }
  }

  async function onForgotPassword() {
    setPending(true);
    setError(null);
    setMessage(null);
    const trimmedEmail = email.trim();
    setEmail(trimmedEmail);
    const formData = new FormData();
    formData.set("email", trimmedEmail);
    try {
      const result = await requestPasswordReset(formData);
      if (result.error) setError(result.error);
      else setMessage(result.message ?? "Check your email for a reset link.");
    } catch (err) {
      if (isNextRedirectError(err)) throw err;
      setError("Could not send reset email. Set the password in Supabase Auth → Users instead.");
    } finally {
      setPending(false);
    }
  }

  async function onSendLink(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const trimmedEmail = email.trim();
    setEmail(trimmedEmail);
    formData.set("email", trimmedEmail);
    formData.set("next", nextPath);
    try {
      const result = await sendMagicLink(formData);
      if (result.error) {
        setError(result.error);
        setShowOtp(true);
        return;
      }
      setShowOtp(true);
      setMessage(result.message ?? "Check your email.");
      if (result.email) setEmail(result.email);
    } catch (err) {
      if (isNextRedirectError(err)) throw err;
      setError("Could not send magic link. Prefer email + password.");
    } finally {
      setPending(false);
    }
  }

  async function onVerifyOtp(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const trimmedEmail = email.trim();
    setEmail(trimmedEmail);
    formData.set("email", trimmedEmail);
    formData.set("token", otp);
    formData.set("next", nextPath);
    try {
      const result = await verifyEmailOtp(formData);
      if (result?.error) {
        setError(result.error);
        setShowOtp(true);
      }
    } catch (err) {
      if (isNextRedirectError(err)) throw err;
      setError("Could not verify the code. Prefer email + password.");
    } finally {
      setPending(false);
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
            placeholder="treasurer@bssb.cz"
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

      <button
        type="button"
        className="btn btn-ghost"
        style={{ justifySelf: "start" }}
        disabled={pending || !email.trim()}
        onClick={() => void onForgotPassword()}
      >
        Forgot password?
      </button>

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
            disabled={pending || !email.trim()}
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
              disabled={pending || !email.trim()}
            >
              {pending ? "Verifying…" : "Verify code and sign in"}
            </button>
          </form>
        ) : null}
      </details>
    </div>
  );
}
