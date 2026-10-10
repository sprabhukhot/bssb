"use client";

import { useState } from "react";
import { addOrganizer, removeOrganizer } from "@/lib/actions/organizers";

type Row = { email: string; role: string };

export function OrganizersManager({ initial }: { initial: Row[] }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onAdd(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await addOrganizer(formData);
    setPending(false);
    if (result.error) setError(result.error);
    else setMessage(result.message ?? "Added.");
  }

  async function onRemove(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await removeOrganizer(formData);
    setPending(false);
    if (result.error) setError(result.error);
    else setMessage(result.message ?? "Removed.");
  }

  return (
    <div className="stack-form">
      <form action={onAdd} className="stack-form panel portal-panel">
        <h2 className="register-panel__title">Add person</h2>
        <label className="field">
          <span>Email</span>
          <input
            name="email"
            type="email"
            required
            placeholder="volunteer@bssb.cz"
            autoComplete="email"
          />
        </label>
        <label className="field">
          <span>Role</span>
          <select name="role" defaultValue="organizer">
            <option value="organizer">Organizer (events only)</option>
            <option value="admin">Admin (site + organizers)</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add"}
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <div className="panel portal-panel table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {initial.map((row) => (
              <tr key={row.email}>
                <td>
                  <strong>{row.email}</strong>
                </td>
                <td>
                  <span
                    className={`badge ${row.role === "admin" ? "badge-live" : "badge-draft"}`}
                  >
                    {row.role === "admin" ? "Admin" : "Organizer"}
                  </span>
                </td>
                <td>
                  <form action={onRemove}>
                    <input type="hidden" name="email" value={row.email} />
                    <button
                      className="btn btn-ghost btn-danger"
                      type="submit"
                      disabled={pending}
                    >
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
