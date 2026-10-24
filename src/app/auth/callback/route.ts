import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { authFailureReason } from "@/lib/auth-errors";
import { getSiteUrl, getSupabaseEnv } from "@/lib/env";

const OTP_TYPES: readonly EmailOtpType[] = [
  "magiclink",
  "email",
  "signup",
  "invite",
  "recovery",
  "email_change",
];

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/admin";
  return raw;
}

function appOrigin(requestUrl: URL): string {
  try {
    if (process.env.NODE_ENV === "production") return getSiteUrl();
  } catch {
    // Misconfigured env — fall back to the request host.
  }
  return requestUrl.origin;
}

function isOtpType(value: string | null): value is EmailOtpType {
  return !!value && (OTP_TYPES as readonly string[]).includes(value);
}

/** Prefer declared type; recovery stays recovery-only. */
function typesToTry(typeParam: string | null): EmailOtpType[] {
  if (typeParam === "recovery") return ["recovery"];
  const preferred = isOtpType(typeParam) ? [typeParam] : [];
  const fallback: EmailOtpType[] = ["email", "magiclink"];
  return [...preferred, ...fallback.filter((t) => t !== typeParam)];
}

/**
 * Completes magic-link / email OTP / recovery.
 *
 * Prefer `token_hash` + `type`. PKCE `code` remains a fallback for default
 * ConfirmationURL emails. Recovery always continues to `/auth/reset`.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = appOrigin(requestUrl);
  const token_hash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const code = searchParams.get("code");

  let next = safeNextPath(searchParams.get("next"));
  // Password recovery must land on the set-password form, never /admin or home.
  if (typeParam === "recovery" || next === "/auth/reset") {
    next = "/auth/reset";
  }

  const successRedirect = NextResponse.redirect(`${origin}${next}`);
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          successRedirect.cookies.set(name, value, options);
        });
      },
    },
  });

  let lastMessage: string | null = null;

  if (token_hash) {
    const typePreview =
      typeof typeParam === "string" ? typeParam.slice(0, 32) : "";
    if (typeParam && !isOtpType(typeParam)) {
      console.info("[auth/callback] unrecognized otp type", {
        type: typePreview,
      });
    }
    for (const type of typesToTry(typeParam)) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });
      if (!error) {
        console.info("[auth/callback] verifyOtp ok", { type });
        return successRedirect;
      }
      lastMessage = error.message;
      console.info("[auth/callback] verifyOtp failed", {
        type,
        code: error.code ?? null,
      });
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Default recovery emails sometimes only pass `code` (no type=).
      // If next was still /admin, send recovery-looking sessions to reset when
      // the URL explicitly asked for reset or type=recovery (handled above).
      return successRedirect;
    }
    lastMessage = error.message;
    console.info("[auth/callback] exchangeCodeForSession failed", {
      code: error.code ?? null,
    });
  } else {
    console.info("[auth/callback] missing token_hash and code");
  }

  const reason = authFailureReason(lastMessage, {
    usedCodeOnly: Boolean(code) && !token_hash,
    missingToken: !token_hash && !code,
    typeIssue: Boolean(token_hash && typeParam && !isOtpType(typeParam)),
  });
  const failPath =
    typeParam === "recovery" || next === "/auth/reset"
      ? `/auth/reset?error=auth&reason=${encodeURIComponent(reason)}`
      : `/login?error=auth&reason=${encodeURIComponent(reason)}`;
  return NextResponse.redirect(`${origin}${failPath}`);
}
