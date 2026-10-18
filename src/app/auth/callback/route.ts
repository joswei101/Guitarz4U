import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";

/** Handles email confirmation, password-reset and Google sign-in redirects (PKCE code flow). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  const errorDescription = searchParams.get("error_description");
  console.warn("Auth callback failed", errorDescription ?? "missing or invalid code");
  return NextResponse.redirect(`${origin}/login?error=link`);
}
