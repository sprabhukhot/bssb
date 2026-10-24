import Link from "next/link";
import { ParticipantChrome } from "@/components/participant-chrome";
import { createClient } from "@/lib/supabase/server";

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
            {mail === "sent"
              ? "A confirmation email was sent."
              : "We could not send a confirmation email. Your registration is still saved."}
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
