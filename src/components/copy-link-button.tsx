"use client";

import { useState } from "react";

export function CopyLinkButton({
  url,
  label = "Copy link",
  className = "btn btn-secondary",
}: {
  url: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback for restricted clipboard
      window.prompt("Copy this registration link:", url);
    }
  }

  return (
    <button className={className} type="button" onClick={onCopy}>
      {copied ? "Copied!" : label}
    </button>
  );
}
