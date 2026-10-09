/** Minimal chrome for attendees — no organizer nav, login, or portal links. */
export function ParticipantChrome({
  children,
  eventLabel,
}: {
  children: React.ReactNode;
  eventLabel?: string;
}) {
  return (
    <div className="participant">
      <header className="participant-bar">
        <div className="shell participant-bar__inner">
          <div className="participant-brand">
            <span className="participant-brand__dot" aria-hidden="true" />
            <div>
              <p className="participant-brand__org">
                Bhartiya Sanskritik Sangh, Brno
              </p>
              {eventLabel ? (
                <p className="participant-brand__event">{eventLabel}</p>
              ) : null}
            </div>
          </div>
        </div>
      </header>
      <div className="participant-body">{children}</div>
    </div>
  );
}
