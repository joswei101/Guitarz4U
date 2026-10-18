import { getObject } from "@/lib/storage";

// Serves PUBLIC product images when no storage CDN URL is configured (local development).
export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const k = key.join("/");
  if (!/^products\/[a-z0-9-]+\.webp$/i.test(k)) return new Response("Not found", { status: 404 });
  const data = await getObject("public", k);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable" },
  });
}
