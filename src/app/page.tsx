import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <main className="landing">
      <SiteHeader
        subtitle="Preserving & Celebrating Culture"
        right={
          <Link className="btn btn-nav-active" href="/login">
            Organizer sign in
          </Link>
        }
      />
      <section className="hero-banner">
        <div className="hero-banner__veil">
          <div className="hero-banner__inner">
            <h1>Bhartiya Sanskritik Sangh, Brno</h1>
            <p>
              Music, dance, language, and festivals—community gatherings where
              we meet, celebrate, and welcome families in Brno.
            </p>
          </div>
        </div>
      </section>
      <section className="landing-about shell">
        <h2>Events with BSSB</h2>
        <p>
          From Navratri and cultural evenings to seva and langar, BSSB brings
          people together. Volunteers publish each gathering with a simple
          registration link for guests—no accounts required for attendees.
        </p>
        <ul className="landing-pillars">
          <li>
            <strong>Gather</strong>
            <span>Set the date, place, and welcome for your event</span>
          </li>
          <li>
            <strong>Invite</strong>
            <span>Share one link with friends, WhatsApp groups, and posters</span>
          </li>
          <li>
            <strong>Celebrate</strong>
            <span>See who is coming and keep the community close</span>
          </li>
        </ul>
      </section>
      <footer className="site-footer">
        <div className="shell">
          © Bhartiya Sanskritik Sangh, Brno ·{" "}
          <a href="https://bssb.cz/" rel="noreferrer">
            bssb.cz
          </a>
        </div>
      </footer>
    </main>
  );
}
