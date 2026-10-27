import Link from "next/link";
import { ParticipantChrome } from "@/components/participant-chrome";
import { createClient } from "@/lib/supabase/server";

function mailNote(mail: string | undefined): string {
  switch (mail) {
    case "sent":
      return "A confirmation email was sent.";
    case "no_address":
      return "We had no email address to send to. Your registration is still saved.";
    case "missing_key":
      return "Confirmation email is not configured. Your registration is still saved.";
    case "restricted":
      return "Confirmation email can only reach the organizer test inbox until the sending domain is verified. Your registration is still saved.";
    case "invalid_from":
      return "The confirmation sender address is not allowed. Your registration is still saved.";
    case "invalid_to":
      return "The email address on the form could not be used. Your registration is still saved.";
    default:
      return "We could not send a confirmation email. Your registration is still saved.";
  }
}

export default async function ThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mail?: string }>;
}) {
  const { slug } = await params;
  const { mail } = await searchParams;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("title, slug")
    .eq("slug", slug)
    .maybeSingle();

  return (
    <ParticipantChrome eventLabel="Registration confirmed">
      <main className="shell participant-main">
        <div className="participant-card participant-card--narrow">
          <p className="notice notice-ok">You are registered.</p>
          <h1 className="page-title" style={{ marginTop: "1rem" }}>
            Thank you
          </h1>
          <p className="page-lead">
            {event
              ? `We have your registration for ${event.title}.`
              : "We have your registration."}{" "}
            {mailNote(mail)}
          </p>
          {event ? (
            <Link className="btn btn-primary" href={`/e/${event.slug}`}>
              Back to event
            </Link>
          ) : null}
        </div>
      </main>
    </ParticipantChrome>
  );
}
