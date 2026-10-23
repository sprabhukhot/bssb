"use client";

import { useEffect, useId, useState } from "react";
import {
  answerDisplayValue,
  type FormField,
} from "@/lib/form-fields";
import type { RegistrationRow } from "@/lib/types";

type Props = {
  eventId: string;
  fields: FormField[];
  rows: RegistrationRow[];
  timezone: string;
};

type EntryView = {
  id: string;
  name: string;
  registeredAt: string;
  pairs: { label: string; value: string }[];
};

function toEntry(
  row: RegistrationRow,
  fields: FormField[],
  timezone: string,
): EntryView {
  const answers = (row.answers ?? {}) as Record<string, unknown>;
  const pairs = fields.map((f) => {
    let value = answers[f.id];
    if (value == null && f.id === "full_name") value = row.full_name;
    if (value == null && f.id === "email") value = row.email;
    if (value == null && f.id === "phone") value = row.phone;
    return {
      label: f.label,
      value: answerDisplayValue(value, f) || "—",
    };
  });
  const name =
    answerDisplayValue(answers.full_name ?? row.full_name) || "Guest";
  return {
    id: row.id,
    name,
    registeredAt: new Date(row.created_at).toLocaleString("en-GB", {
      timeZone: timezone,
    }),
    pairs,
  };
}

export function AttendeesList({ eventId, fields, rows, timezone }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const titleId = useId();
  const entries = rows.map((r) => toEntry(r, fields, timezone));
  const open = entries.find((e) => e.id === openId) ?? null;

  useEffect(() => {
    if (!openId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  if (!rows.length) {
    return <p className="empty">No registrations yet.</p>;
  }

  return (
    <>
      <div className="attendees-export-row">
        <a className="btn btn-secondary" href={`/admin/events/${eventId}/export`}>
          Export CSV
        </a>
        <a
          className="btn btn-secondary"
          href={`/admin/events/${eventId}/export.xlsx`}
        >
          Export Excel
        </a>
      </div>

      <div className="table-wrap attendees-table-wrap">
        <table className="data attendees-table">
          <thead>
            <tr>
              {fields.map((f) => (
                <th key={f.id}>{f.label}</th>
              ))}
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="attendee-row-clickable"
                tabIndex={0}
                role="button"
                onClick={() => setOpenId(entry.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenId(entry.id);
                  }
                }}
              >
                {entry.pairs.map((p) => (
                  <td key={p.label}>{p.value}</td>
                ))}
                <td>{entry.registeredAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="attendee-cards">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className="attendee-card attendee-card--button"
              onClick={() => setOpenId(entry.id)}
            >
              <strong>{entry.name}</strong>
              <span className="muted">{entry.registeredAt}</span>
            </button>
          </li>
        ))}
      </ul>

      {open ? (
        <div
          className="entry-modal-backdrop"
          role="presentation"
          onClick={() => setOpenId(null)}
        >
          <div
            className="entry-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="entry-modal__head">
              <h2 id={titleId}>{open.name}</h2>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpenId(null)}
              >
                Close
              </button>
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              Registered {open.registeredAt}
            </p>
            <dl className="entry-modal__dl">
              {open.pairs.map((p) => (
                <div key={p.label}>
                  <dt>{p.label}</dt>
                  <dd>{p.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : null}
    </>
  );
}
