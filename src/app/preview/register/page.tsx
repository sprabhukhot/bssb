import { ParticipantChrome } from "@/components/participant-chrome";

export default function PreviewRegisterPage() {
  return (
    <ParticipantChrome eventLabel="Demo registration">
      <main className="shell participant-main">
        <div className="participant-card">
          <header className="participant-event">
            <p className="participant-demo-note">
              Demo — the registration page guests see from a BSSB event share
              link.
            </p>
            <h1>Brno Navratri Utsav 2026</h1>
            <ul className="participant-meta">
              <li>Sun, 11 Oct 2026, 5:00 pm</li>
              <li>Cultural Center Líšeň - Dělňák, Brno</li>
              <li>Open registration</li>
            </ul>
            <p className="participant-desc">
              Devotion, dance, music, and culture. Register your party, optional
              snacks &amp; dandiya, then pay to confirm your spot.
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
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  readOnly
                />
              </label>

              <div className="form-section">
                <p className="form-section__title">Attendance</p>
                <div className="field-grid">
                  <label className="field">
                    <span>Adults (over 10 years)</span>
                    <input type="number" defaultValue={2} readOnly />
                  </label>
                  <label className="field">
                    <span>Children (under 10)</span>
                    <input type="number" defaultValue={1} readOnly />
                  </label>
                </div>
              </div>

              <div className="form-section">
                <p className="form-section__title">Optional snacks &amp; dandiya</p>
                <div className="field-grid">
                  {[
                    ["Dandiya sets", 1],
                    ["Samosas", 2],
                    ["Kachoris", 0],
                    ["Tea / chai", 2],
                    ["Jalebi plates", 0],
                  ].map(([label, val]) => (
                    <label className="field" key={String(label)}>
                      <span>{label}</span>
                      <input type="number" defaultValue={Number(val)} readOnly />
                    </label>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>Comments (optional)</span>
                <textarea
                  rows={2}
                  placeholder="Child ages, friends you paid for…"
                  readOnly
                />
              </label>

              <label className="check-field">
                <input type="checkbox" defaultChecked readOnly />
                <span>
                  I understand registration is valid only after payment is
                  received.
                </span>
              </label>
              <label className="check-field">
                <input type="checkbox" defaultChecked readOnly />
                <span>
                  I consent to BSSB processing my personal data for this and
                  related event communication.
                </span>
              </label>

              <button className="btn btn-primary" type="button">
                Register
              </button>
            </form>
          </section>
        </div>
      </main>
    </ParticipantChrome>
  );
}
