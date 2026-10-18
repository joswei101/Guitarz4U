import { NextResponse, type NextRequest } from "next/server";

/**
 * Sets a per-request nonce-based Content Security Policy and performs a cheap
 * "is there a session cookie" redirect for private areas. Real authorisation
 * happens on the server in every page, action and route handler.
 */
export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  const payfast = "https://sandbox.payfast.co.za https://www.payfast.co.za";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "frame-ancestors 'none'",
    `form-action 'self' ${payfast}`,
    "base-uri 'self'",
    "object-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const { pathname } = req.nextUrl;
  const needsSession = pathname.startsWith("/account") || pathname.startsWith("/admin") || pathname.startsWith("/checkout");
  if (needsSession && !req.cookies.get("g4u_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  if (pathname.startsWith("/admin") || pathname.startsWith("/account")) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: [{ source: "/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|images/).*)", missing: [{ type: "header", key: "next-router-prefetch" }] }],
};
