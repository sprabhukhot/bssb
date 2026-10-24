"use client";

import { useEffect } from "react";

/**
 * Default Supabase recovery emails land on Site URL with a hash fragment:
 *   https://events.bssb.cz/#access_token=…&type=recovery&refresh_token=…
 * Server components never see the hash — bounce to /auth/reset preserving it.
 */
export function RecoveryHashRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const type = params.get("type");
    const access = params.get("access_token");
    if (type === "recovery" && access) {
      window.location.replace(`/auth/reset#${hash}`);
    }
  }, []);

  return null;
}
