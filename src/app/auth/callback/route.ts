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

/** Prefer declared type, then try email + magiclink (common Magic link templates). */
function typesToTry(typeParam: string | null): EmailOtpType[] {
  const preferred = isOtpType(typeParam) ? [typeParam] : [];
  const fallback: EmailOtpType[] = ["email", "magiclink"];
  return [...preferred, ...fallback.filter((t) => t !== typeParam)];
}

/**
 * Completes magic-link / email OTP sign-in.
 *
 * Prefer `token_hash` + `type` (email or magiclink). PKCE `code` remains a
 * fallback for default ConfirmationURL emails, but that flow fails across browsers.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = appOrigin(requestUrl);
  const next = safeNextPath(searchParams.get("next"));
  const token_hash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const code = searchParams.get("code");

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
    if (typeParam && !isOtpType(typeParam)) {
      console.info("[auth/callback] unrecognized otp type", {
        type: typeParam.slice(0, 32),
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
    if (!error) return successRedirect;
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
  return NextResponse.redirect(
    `${origin}/login?error=auth&reason=${encodeURIComponent(reason)}`,
  );
}
