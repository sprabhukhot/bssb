"use client";

import { useEffect, useState } from "react";
import { updatePassword } from "@/lib/actions/password";
import { isNextRedirectError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

type Status = "loading" | "ready" | "error";

export function ResetPasswordForm({
  tokenHash,
  code,
}: {
  tokenHash?: string;
  code?: string;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function establishSession() {
      setStatus("loading");
      setError(null);
      const supabase = createClient();

      try {
        // 1) Implicit / recovery hash from default ConfirmationURL
        const hash = window.location.hash.replace(/^#/, "");
        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          const type = params.get("type");
          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;
            // Clean hash from URL (tokens no longer in address bar)
            window.history.replaceState(null, "", "/auth/reset");
            if (!cancelled) setStatus("ready");
            return;
          }
          if (type === "recovery" && !access_token) {
            // Hash present but incomplete — fall through
          }
        }

        // 2) token_hash + type=recovery (custom template /auth/confirm path)
        if (tokenHash) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (otpError) throw otpError;
          if (!cancelled) setStatus("ready");
          return;
        }

        // 3) PKCE code (default email when redirectTo=/auth/reset)
        if (code) {
          const { error: codeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (codeError) throw codeError;
          if (!cancelled) setStatus("ready");
          return;
        }

        // 4) Already have a session (e.g. /auth/callback just redirected here)
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          if (!cancelled) setStatus("ready");
          return;
        }

        if (!cancelled) {
          setStatus("error");
          setError(
            "This reset link is missing its token or has expired. Use Forgot password on the login page, or set the password in Supabase → Authentication → Users (delete + recreate with Auto Confirm).",
          );
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(
          err instanceof Error
            ? err.message.slice(0, 200)
            : "Could not open the reset session.",
        );
      }
    }

    void establishSession();
    return () => {
      cancelled = true;
    };
  }, [tokenHash, code]);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    formData.set("password", password);
    formData.set("confirm", confirm);
    try {
      const result = await updatePassword(formData);
      if (result?.error) setError(result.error);
    } catch (err) {
      if (isNextRedirectError(err)) throw err;
      setError(
        err instanceof Error
          ? err.message.slice(0, 160)
          : "Could not update password.",
      );
    } finally {
      setPending(false);
    }
  }

  if (status === "loading") {
    return <p className="muted">Opening reset session…</p>;
  }

  if (status === "error") {
    return (
      <div className="stack-form">
        <p className="form-error">{error}</p>
        <a className="btn btn-secondary" href="/login">
          Back to sign in
        </a>
      </div>
    );
  }

  return (
    <form action={onSubmit} className="stack-form">
      <label className="field">
        <span>New password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Confirm password</span>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
