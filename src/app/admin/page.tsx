import Link from "next/link";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CopyLinkButton } from "@/components/copy-link-button";
import { deleteEvent, duplicateEvent } from "@/lib/actions/events";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_EVENT_TIMEZONE } from "@/lib/timezone";
import { formatEventWhen, publicEventUrl } from "@/lib/utils";

export default async function AdminEventsPage() {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return null;

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  return (
    <>
      <div className="admin-toolbar">
        <div>
          <p className="portal-kicker">BSSB community events</p>
          <h1 className="page-title">Our events</h1>
          <p className="page-lead">
            Prepare a gathering, publish when ready, and share the guest
            registration link. Homepage copy and the organizers list are managed
            by the site admin only.
          </p>
        </div>
        <Link className="btn btn-primary" href="/admin/events/new">
          New event
        </Link>
      </div>

      {error ? <p className="form-error">{error.message}</p> : null}

      {!events?.length ? (
        <p className="empty">
          No events yet. Create one, publish it, then copy the public link.
        </p>
      ) : (
        <>
          <div className="panel table-wrap desktop-only">
            <table className="data">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>When</th>
                  <th>Status</th>
                  <th>Share</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const url = publicEventUrl(event.slug, siteUrl);
                  const tz = event.timezone || DEFAULT_EVENT_TIMEZONE;
                  return (
                    <tr key={event.id}>
                      <td>
                        <strong>{event.title}</strong>
                        <div className="muted">{event.location}</div>
                      </td>
                      <td>
                        {formatEventWhen(event.starts_at, event.ends_at, tz)}
                      </td>
                      <td>
                        <span
                          className={`badge ${event.is_published ? "badge-live" : "badge-draft"}`}
                        >
                          {event.is_published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td>
                        {event.is_published ? (
                          <div className="row-actions">
                            <Link href={`/e/${event.slug}`}>
                              /e/{event.slug}
                            </Link>
                            <CopyLinkButton
                              url={url}
                              label="Copy link"
                              className="btn btn-secondary"
                            />
                          </div>
                        ) : (
                          <span className="muted">Publish to share</span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <Link
                            className="btn btn-ghost"
                            href={`/admin/events/${event.id}`}
                          >
                            Open
                          </Link>
                          <form
                            action={async () => {
                              "use server";
                              await duplicateEvent(event.id);
                            }}
                          >
                            <button className="btn btn-ghost" type="submit">
                              Duplicate
                            </button>
                          </form>
                          <ConfirmDeleteButton
                            className="btn btn-danger"
                            label="Delete"
                            confirmMessage={`Delete “${event.title}”? Registrations for this event will be permanently removed.`}
                            action={async () => {
                              "use server";
                              return deleteEvent(event.id);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="event-cards mobile-only">
            {events.map((event) => {
              const url = publicEventUrl(event.slug, siteUrl);
              const tz = event.timezone || DEFAULT_EVENT_TIMEZONE;
              return (
                <li key={event.id} className="event-card panel">
                  <div className="event-card__top">
                    <strong>{event.title}</strong>
                    <span
                      className={`badge ${event.is_published ? "badge-live" : "badge-draft"}`}
                    >
                      {event.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="muted" style={{ margin: "0.35rem 0" }}>
                    {formatEventWhen(event.starts_at, event.ends_at, tz)}
                  </p>
                  {event.location ? (
                    <p className="muted" style={{ margin: 0 }}>
                      {event.location}
                    </p>
                  ) : null}
                  <div className="row-actions event-card__actions">
                    <Link
                      className="btn btn-primary"
                      href={`/admin/events/${event.id}`}
                    >
                      Open
                    </Link>
                    {event.is_published ? (
                      <CopyLinkButton
                        url={url}
                        label="Copy link"
                        className="btn btn-secondary"
                      />
                    ) : null}
                    <form
                      action={async () => {
                        "use server";
                        await duplicateEvent(event.id);
                      }}
                    >
                      <button className="btn btn-ghost" type="submit">
                        Duplicate
                      </button>
                    </form>
                    <ConfirmDeleteButton
                      label="Delete"
                      confirmMessage={`Delete “${event.title}”? Registrations for this event will be permanently removed.`}
                      action={async () => {
                        "use server";
                        return deleteEvent(event.id);
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
