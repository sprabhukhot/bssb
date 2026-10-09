"use client";

import Link from "next/link";
import { CopyLinkButton } from "@/components/copy-link-button";

export function ShareLinkCard({
  slug,
  url,
  isPublished,
}: {
  slug: string;
  url: string;
  isPublished: boolean;
}) {
  if (!isPublished) {
    return (
      <div className="panel share-card">
        <h2 className="share-card__title">Shareable link</h2>
        <p className="page-lead" style={{ marginBottom: "0.75rem" }}>
          Publish this event to unlock the public registration link you can
          float to the crowd.
        </p>
        <p className="muted">Draft path preview: /e/{slug}</p>
      </div>
    );
  }

  return (
    <div className="panel share-card">
      <h2 className="share-card__title">Shareable link</h2>
      <p className="page-lead" style={{ marginBottom: "0.75rem" }}>
        Copy this link and send it on WhatsApp / email / posters.
      </p>
      <code className="share-card__url">{url}</code>
      <div className="row-actions" style={{ marginTop: "0.85rem" }}>
        <CopyLinkButton url={url} label="Copy link" />
        <Link className="btn btn-ghost" href={`/e/${slug}`} target="_blank">
          Open public page
        </Link>
      </div>
    </div>
  );
}
