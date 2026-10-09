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
import { formatEventWhen, publicEventUrl } from "@/lib/utils";
import type { RegistrationRow } from "@/lib/types";

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

  const { data: registrations } = await supabase
    .from("registrations")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  const rows = (registrations ?? []) as RegistrationRow[];
  const headcount = rows.reduce(
    (sum, row) => sum + (row.adults_count ?? 0) + (row.children_count ?? 0),
    0,
  );
  const shareUrl = publicEventUrl(event.slug, process.env.NEXT_PUBLIC_SITE_URL);

  async function save(formData: FormData) {
    "use server";
    return updateEvent(id, formData);
  }

  return (
    <>
      <Link className="muted" href="/admin">
        ← All events
      </Link>
      <h1 className="page-title" style={{ marginTop: "0.75rem" }}>
        {event.title}
      </h1>
      <p className="page-lead">
        {formatEventWhen(event.starts_at, event.ends_at)}
        {event.capacity == null ? " · Unlimited capacity" : ` · Cap ${event.capacity}`}
      </p>

      <ShareLinkCard
        slug={event.slug}
        url={shareUrl}
        isPublished={event.is_published}
      />

      <div className="admin-grid split" style={{ marginTop: "1.25rem" }}>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Edit event</h2>
          <EventForm event={event} action={save} submitLabel="Save changes" />
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
              Attendees ({headcount} people / {rows.length} forms
              {event.capacity != null ? ` · cap ${event.capacity}` : ""})
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
                    <th>Party</th>
                    <th>Snacks</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.full_name}</strong>
                        {row.comments ? (
                          <div className="muted">{row.comments}</div>
                        ) : null}
                      </td>
                      <td>
                        <div>{row.phone}</div>
                        <div className="muted">{row.email || "—"}</div>
                      </td>
                      <td>
                        {row.adults_count}A + {row.children_count}C
                      </td>
                      <td className="muted">
                        D{row.dandiya_sets} S{row.samosas} K{row.kachoris} T
                        {row.teas} J{row.jalebis}
                      </td>
                      <td>
                        {new Date(row.created_at).toLocaleString("en-IN", {
                          timeZone: "Europe/Prague",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
