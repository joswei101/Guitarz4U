import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Handles links from Supabase emails (verification, password recovery, email
// change) and OAuth sign-in callbacks (Google), then redirects onwards.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next") ?? "/account";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const destination = request.nextUrl.clone();
  destination.search = "";
  if (ok) {
    const [path, query] = next.split("?");
    destination.pathname = path;
    if (query) destination.search = `?${query}`;
    if (type === "signup" || type === "email") destination.searchParams.set("verified", "1");
  } else {
    destination.pathname = "/login";
    destination.searchParams.set("error", "link");
  }
  return NextResponse.redirect(destination);
}
