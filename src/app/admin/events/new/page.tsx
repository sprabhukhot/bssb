import Link from "next/link";
import { EventForm } from "@/components/event-form";
import { createEvent } from "@/lib/actions/events";
import { requireAdmin } from "@/lib/auth";

export default async function NewEventPage() {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return null;

  return (
    <>
      <Link className="muted" href="/admin">
        ← All events
      </Link>
      <h1 className="page-title" style={{ marginTop: "0.75rem" }}>
        New event
      </h1>
      <div className="panel" style={{ maxWidth: 640 }}>
        <EventForm action={createEvent} submitLabel="Create event" />
      </div>
    </>
  );
}
