import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatEventWhen, publicEventUrl } from "@/lib/utils";
import { duplicateEvent } from "@/lib/actions/events";
import { CopyLinkButton } from "@/components/copy-link-button";

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
        <div className="panel table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Event</th>
                <th>When</th>
                <th>Status</th>
                <th>Share</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const url = publicEventUrl(event.slug, siteUrl);
                return (
                  <tr key={event.id}>
                    <td>
                      <strong>{event.title}</strong>
                      <div className="muted">{event.location}</div>
                    </td>
                    <td>{formatEventWhen(event.starts_at, event.ends_at)}</td>
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
                          <Link href={`/e/${event.slug}`}>/e/{event.slug}</Link>
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
