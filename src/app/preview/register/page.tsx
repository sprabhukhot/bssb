import { ParticipantChrome } from "@/components/participant-chrome";

export default function PreviewRegisterPage() {
  return (
    <ParticipantChrome eventLabel="Demo registration">
      <main className="shell participant-main">
        <div className="participant-card">
          <header className="participant-event">
            <p className="participant-demo-note">
              Demo — guests see only the fields the organizer configured for
              this event (default: name, phone, required email).
            </p>
            <h1>Community gathering</h1>
            <ul className="participant-meta">
              <li>Sat, 1 Nov 2026, 5:00 pm</li>
              <li>Brno</li>
              <li>Open registration</li>
            </ul>
            <p className="participant-desc">
              Organizers design the registration form per event — snacks,
              party size, or custom questions are optional fields they add.
            </p>
          </header>

          <section className="participant-form-block">
            <h2>Register</h2>
            <form className="stack-form register-form">
              <label className="field">
                <span>Your name</span>
                <input name="full_name" placeholder="Your name" readOnly />
              </label>
              <label className="field">
                <span>Contact number</span>
                <input name="phone" type="tel" placeholder="+420 …" readOnly />
                <small className="hint">
                  Required — one registration per phone.
                </small>
              </label>
              <label className="field">
                <span>Email (optional)</span>
                <input name="email" type="email" placeholder="you@example.com" readOnly />
              </label>
              <button className="btn btn-primary" type="button" disabled>
                Register
              </button>
            </form>
          </section>
        </div>
      </main>
    </ParticipantChrome>
  );
}
