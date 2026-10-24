import Link from "next/link";
import { RecoveryHashRedirect } from "@/components/recovery-hash-redirect";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SITE_CONTENT, mergeSiteContent } from "@/lib/site-content";

export default async function HomePage() {
  let content = DEFAULT_SITE_CONTENT;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("*")
      .eq("id", "home")
      .maybeSingle();
    if (!error && data) content = mergeSiteContent(data);
  } catch {
    // Missing env / table → static fallbacks
  }

  return (
    <main className="landing">
      <RecoveryHashRedirect />
      <SiteHeader
        subtitle={content.subtitle}
        right={
          <Link className="btn btn-nav-active" href="/login">
            Organizer sign in
          </Link>
        }
      />
      <section className="hero-banner">
        <div className="hero-banner__veil">
          <div className="hero-banner__inner">
            <h1>{content.hero_headline}</h1>
            <p>{content.hero_body}</p>
          </div>
        </div>
      </section>
      <section className="landing-about shell">
        <h2>{content.about_title}</h2>
        <p>{content.about_body}</p>
        <ul className="landing-pillars">
          <li>
            <strong>{content.pillar_1_title}</strong>
            <span>{content.pillar_1_body}</span>
          </li>
          <li>
            <strong>{content.pillar_2_title}</strong>
            <span>{content.pillar_2_body}</span>
          </li>
          <li>
            <strong>{content.pillar_3_title}</strong>
            <span>{content.pillar_3_body}</span>
          </li>
        </ul>
      </section>
      <footer className="site-footer">
        <div className="shell">
          {content.footer_text} ·{" "}
          <a href="https://bssb.cz/" rel="noreferrer">
            bssb.cz
          </a>
        </div>
      </footer>
    </main>
  );
}
