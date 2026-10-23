import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendeesList } from "@/components/attendees-list";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { EventAnalyticsPanel } from "@/components/analytics-panel";
import { EventForm } from "@/components/event-form";
import { ShareLinkCard } from "@/components/share-link-card";
import {
  deleteEvent,
  duplicateEvent,
  updateEvent,
} from "@/lib/actions/events";
import { buildEventAnalytics } from "@/lib/analytics";
import { requireAdmin } from "@/lib/auth";
import { parseFormFieldsJson } from "@/lib/form-fields";
import { DEFAULT_EVENT_TIMEZONE } from "@/lib/timezone";
import {
  formatEventWhen,
  publicEventUrl,
  registrationHeadcount,
} from "@/lib/utils";
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
  const timezone = eventRow.timezone || DEFAULT_EVENT_TIMEZONE;

  const { data: registrations } = await supabase
    .from("registrations")
    .select("*")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  const rows = (registrations ?? []) as RegistrationRow[];
  const formCount = rows.length;
  const headcount = rows.reduce(
    (sum, row) => sum + registrationHeadcount(row.answers, row),
    0,
  );
  const shareUrl = publicEventUrl(
    eventRow.slug,
    process.env.NEXT_PUBLIC_SITE_URL,
  );
  const analytics = buildEventAnalytics(rows, fields, timezone);

  async function save(formData: FormData) {
    "use server";
    return updateEvent(id, formData);
  }

  async function remove() {
    "use server";
    return deleteEvent(id);
  }

  const confirmMsg =
    formCount > 0
      ? `Delete “${eventRow.title}”? This permanently removes ${formCount} registration${formCount === 1 ? "" : "s"} and cannot be undone.`
      : `Delete “${eventRow.title}”? This cannot be undone.`;

  return (
    <>
      <Link className="muted" href="/admin">
        ← All events
      </Link>
      <h1 className="page-title" style={{ marginTop: "0.75rem" }}>
        {eventRow.title}
      </h1>
      <p className="page-meta">
        {formatEventWhen(eventRow.starts_at, eventRow.ends_at, timezone)}
        {eventRow.capacity == null
          ? " · Unlimited capacity"
          : ` · Cap ${eventRow.capacity}`}
      </p>

      <section className="live-counter" aria-live="polite">
        <div>
          <p className="live-counter__label">Live registrations</p>
          <p className="live-counter__value">
            {formCount}{" "}
            <span className="live-counter__unit">
              form{formCount === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <div>
          <p className="live-counter__label">People (headcount)</p>
          <p className="live-counter__value">
            {headcount}{" "}
            <span className="live-counter__unit">
              {eventRow.capacity != null ? `/ ${eventRow.capacity} cap` : "total"}
            </span>
          </p>
        </div>
      </section>

      <ShareLinkCard
        slug={eventRow.slug}
        url={shareUrl}
        isPublished={eventRow.is_published}
      />

      <div style={{ marginTop: "1.25rem" }}>
        <EventAnalyticsPanel data={analytics} />
      </div>

      <section className="panel attendees-panel" style={{ marginTop: "1.25rem" }}>
        <div className="attendees-panel__head">
          <h2 style={{ margin: 0 }}>Entries ({formCount})</h2>
        </div>
        <AttendeesList
          eventId={id}
          fields={fields}
          rows={rows}
          timezone={timezone}
        />
      </section>

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
            <ConfirmDeleteButton
              action={remove}
              label="Delete event"
              confirmMessage={confirmMsg}
            />
          </div>
        </div>
      </div>
    </>
  );
}
