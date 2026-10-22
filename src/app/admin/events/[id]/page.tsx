import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { ShareLinkCard } from "@/components/share-link-card";
import {
  deleteEvent,
  duplicateEvent,
  updateEvent,
} from "@/lib/actions/events";
import { requireAdmin } from "@/lib/auth";
import {
  answerDisplayValue,
  parseFormFieldsJson,
} from "@/lib/form-fields";
import { formatEventWhen, publicEventUrl } from "@/lib/utils";
import type { EventRow, RegistrationRow } from "@/lib/types";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return null;

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();

  const eventRow = event as EventRow;
  const fields = parseFormFieldsJson(eventRow.form_fields);

  const { data: registrations } = await supabase
    .from("registrations")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  const rows = (registrations ?? []) as RegistrationRow[];
  const headcount = rows.length;
  const shareUrl = publicEventUrl(
    eventRow.slug,
    process.env.NEXT_PUBLIC_SITE_URL,
  );

  async function save(formData: FormData) {
    "use server";
    return updateEvent(id, formData);
  }

  // Prefer a compact table: name/phone/email-ish + up to 4 extra fields + time
  const extraFields = fields.filter(
    (f) => !["full_name", "phone", "email"].includes(f.id),
  );
  const tableFields = extraFields.slice(0, 4);

  return (
    <>
      <Link className="muted" href="/admin">
        ← All events
      </Link>
      <h1 className="page-title" style={{ marginTop: "0.75rem" }}>
        {eventRow.title}
      </h1>
      <p className="page-lead">
        {formatEventWhen(eventRow.starts_at, eventRow.ends_at)}
        {eventRow.capacity == null
          ? " · Unlimited capacity"
          : ` · Cap ${eventRow.capacity}`}
      </p>

      <ShareLinkCard
        slug={eventRow.slug}
        url={shareUrl}
        isPublished={eventRow.is_published}
      />

      <div className="admin-grid split" style={{ marginTop: "1.25rem" }}>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Edit event</h2>
          <EventForm
            event={eventRow}
            action={save}
            submitLabel="Save changes"
          />
          <div className="row-actions" style={{ marginTop: "1rem" }}>
            <form
              action={async () => {
                "use server";
                await duplicateEvent(id);
              }}
            >
              <button className="btn btn-secondary" type="submit">
                Duplicate event
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                await deleteEvent(id);
              }}
            >
              <button className="btn btn-danger" type="submit">
                Delete
              </button>
            </form>
          </div>
        </div>

        <div className="panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "0.75rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0 }}>
              Attendees ({headcount} forms
              {eventRow.capacity != null ? ` · cap ${eventRow.capacity}` : ""})
            </h2>
            <a className="btn btn-primary" href={`/admin/events/${id}/export`}>
              Export CSV
            </a>
          </div>

          {!rows.length ? (
            <p className="empty">No registrations yet.</p>
          ) : (
            <div className="table-wrap" style={{ marginTop: "1rem" }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    {tableFields.map((f) => (
                      <th key={f.id}>{f.label}</th>
                    ))}
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const answers = (row.answers ?? {}) as Record<
                      string,
                      unknown
                    >;
                    return (
                      <tr key={row.id}>
                        <td>
                          <strong>
                            {answerDisplayValue(
                              answers.full_name ?? row.full_name,
                            )}
                          </strong>
                        </td>
                        <td>
                          <div>
                            {answerDisplayValue(answers.phone ?? row.phone)}
                          </div>
                          <div className="muted">
                            {answerDisplayValue(answers.email ?? row.email) ||
                              "—"}
                          </div>
                        </td>
                        {tableFields.map((f) => (
                          <td key={f.id} className="muted">
                            {answerDisplayValue(answers[f.id]) || "—"}
                          </td>
                        ))}
                        <td>
                          {new Date(row.created_at).toLocaleString("en-IN", {
                            timeZone: "Europe/Prague",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
