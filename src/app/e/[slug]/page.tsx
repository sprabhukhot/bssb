import { notFound } from "next/navigation";
import { ParticipantChrome } from "@/components/participant-chrome";
import { RegisterForm } from "@/components/register-form";
import { parseFormFieldsJson } from "@/lib/form-fields";
import { DEFAULT_EVENT_TIMEZONE } from "@/lib/timezone";
import { createClient } from "@/lib/supabase/server";
import { formatEventWhen } from "@/lib/utils";

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (!event) notFound();

  const { data: count } = await supabase.rpc("event_registration_count", {
    p_event_id: event.id,
  });

  const registered = typeof count === "number" ? count : 0;
  const remaining =
    event.capacity == null ? null : Math.max(event.capacity - registered, 0);
  const isFull = remaining === 0;
  const fields = parseFormFieldsJson(event.form_fields);
  const timezone = event.timezone || DEFAULT_EVENT_TIMEZONE;
  const posterHeading = String(event.poster_heading ?? "").trim();
  const posterBody = String(event.poster_body ?? "").trim();
  const donationHeading = String(event.donation_heading ?? "").trim();
  const donationBody = String(event.donation_body ?? "").trim();

  return (
    <ParticipantChrome eventLabel="Event registration">
      <main className="shell participant-main">
        <div className="participant-card">
          {event.poster_url || posterHeading || posterBody ? (
            <section className="media-hero">
              {event.poster_url ? (
                <div className="media-hero__frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="media-hero__img"
                    src={event.poster_url}
                    alt=""
                  />
                </div>
              ) : null}
              {posterHeading || posterBody ? (
                <div className="media-hero__copy">
                  {posterHeading ? <h2>{posterHeading}</h2> : null}
                  {posterBody ? <p>{posterBody}</p> : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <header className="participant-event">
            <h1>{event.title}</h1>
            <ul className="participant-meta">
              <li>
                {formatEventWhen(event.starts_at, event.ends_at, timezone)}
              </li>
              {event.location ? <li>{event.location}</li> : null}
              <li>
                {event.capacity == null
                  ? "Open registration"
                  : isFull
                    ? "Registration full"
                    : `${remaining} of ${event.capacity} spots left`}
              </li>
            </ul>
            {event.description ? (
              <p className="participant-desc">{event.description}</p>
            ) : null}
          </header>

          {event.donation_image_url || donationBody || donationHeading ? (
            <section className="media-hero media-hero--donation">
              {event.donation_image_url ? (
                <div className="media-hero__frame media-hero__frame--contain">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="media-hero__img"
                    src={event.donation_image_url}
                    alt={donationHeading || "Payment details"}
                  />
                </div>
              ) : null}
              {donationHeading || donationBody ? (
                <div className="media-hero__copy">
                  {donationHeading ? <h2>{donationHeading}</h2> : null}
                  {donationBody ? <p>{donationBody}</p> : null}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="participant-form-block">
            <h2>Register</h2>
            <RegisterForm
              eventId={event.id}
              fields={fields}
              disabled={isFull}
              disabledReason="This event is full. Registration is closed."
            />
          </section>
        </div>
      </main>
    </ParticipantChrome>
  );
}
