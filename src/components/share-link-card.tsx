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
        <p className="muted">Draft: /e/{slug}</p>
      </div>
    );
  }

  return (
    <div className="panel share-card">
      <h2 className="share-card__title">Shareable link</h2>
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
