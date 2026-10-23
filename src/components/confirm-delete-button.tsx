"use client";

import { useState } from "react";

type Props = {
  action: () => Promise<{ error?: string } | void>;
  label?: string;
  /** Shown in window.confirm */
  confirmMessage: string;
  className?: string;
};

export function ConfirmDeleteButton({
  action,
  label = "Delete",
  confirmMessage,
  className = "btn btn-danger",
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!window.confirm(confirmMessage)) return;
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div>
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={onClick}
      >
        {pending ? "Deleting…" : label}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
