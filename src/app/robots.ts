import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api", "/cart", "/track", "/reset-password"] }],
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
