export type SiteContent = {
  id: string;
  subtitle: string;
  hero_headline: string;
  hero_body: string;
  about_title: string;
  about_body: string;
  pillar_1_title: string;
  pillar_1_body: string;
  pillar_2_title: string;
  pillar_2_body: string;
  pillar_3_title: string;
  pillar_3_body: string;
  footer_text: string;
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  id: "home",
  subtitle: "Preserving & Celebrating Culture",
  hero_headline: "Bhartiya Sanskritik Sangh, Brno",
  hero_body:
    "Music, dance, language, and festivals—community gatherings where we meet, celebrate, and welcome families in Brno.",
  about_title: "Events with BSSB",
  about_body:
    "From Navratri and cultural evenings to seva and langar, BSSB brings people together. Volunteers publish each gathering with a simple registration link for guests—no accounts required for attendees.",
  pillar_1_title: "Gather",
  pillar_1_body: "Set the date, place, and welcome for your event",
  pillar_2_title: "Invite",
  pillar_2_body: "Share one link with friends, WhatsApp groups, and posters",
  pillar_3_title: "Celebrate",
  pillar_3_body: "See who is coming and keep the community close",
  footer_text: "© Bhartiya Sanskritik Sangh, Brno",
};

export function mergeSiteContent(
  row: Partial<SiteContent> | null | undefined,
): SiteContent {
  return { ...DEFAULT_SITE_CONTENT, ...row, id: "home" };
}
