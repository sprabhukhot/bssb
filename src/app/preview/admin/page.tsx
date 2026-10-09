import Link from "next/link";
import { OrganizerShell } from "@/components/organizer-shell";
import { CopyLinkButton } from "@/components/copy-link-button";

const events = [
  {
    title: "Brno Navratri Utsav 2026",
    location: "Cultural Center Líšeň - Dělňák",
    when: "Sun, 11 Oct 2026, 5:00 pm",
    status: "Published" as const,
    slug: "navratri-2026",
  },
  {
    title: "Sunday seva & langar",
    location: "Temple courtyard",
    when: "Sun, 26 Oct 2026, 10:00 am",
    status: "Published" as const,
    slug: "seva-langar-oct",
  },
  {
    title: "Youth cultural night (draft)",
    location: "TBD",
    when: "Sat, 8 Nov 2026, 5:00 pm",
    status: "Draft" as const,
    slug: "youth-cultural-night",
  },
];

export default function PreviewAdminPage() {
  return (
    <OrganizerShell
      right={
        <>
          <span className="muted" style={{ fontSize: "0.875rem" }}>
            organizer@bssb.org
          </span>
          <span className="btn btn-nav-active">Events</span>
          <button className="btn btn-ghost" type="button">
            Sign out
          </button>
        </>
      }
    >
      <main className="shell portal-page">
        <div className="admin-toolbar">
          <div>
            <p className="portal-kicker">BSSB community events · demo</p>
            <h1 className="page-title">Our events</h1>
            <p className="page-lead">
              Prepare a gathering, publish when ready, and share the guest
              registration link.
            </p>
          </div>
          <button className="btn btn-primary" type="button">
            New event
          </button>
        </div>

        <div className="panel portal-panel table-wrap">
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
              {events.map((event) => (
                <tr key={event.slug}>
                  <td>
                    <strong>{event.title}</strong>
                    <div className="muted">{event.location}</div>
                  </td>
                  <td>{event.when}</td>
                  <td>
                    <span
                      className={`badge ${event.status === "Published" ? "badge-live" : "badge-draft"}`}
                    >
                      {event.status}
                    </span>
                  </td>
                  <td>
                    {event.status === "Published" ? (
                      <div className="row-actions">
                        <Link href={`/preview/register`}>/e/{event.slug}</Link>
                        <CopyLinkButton
                          url={`https://example.com/e/${event.slug}`}
                          label="Copy link"
                        />
                      </div>
                    ) : (
                      <span className="muted">Publish to share</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost" type="button">
                        Open
                      </button>
                      <button className="btn btn-ghost" type="button">
                        Duplicate
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </OrganizerShell>
  );
}
