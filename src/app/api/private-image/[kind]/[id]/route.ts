import { getCurrentUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { getObject } from "@/lib/storage";

// Serves private seller/repair photos ONLY to administrators or the account that submitted them.
export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Not found", { status: 404 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const sql =
    kind === "seller"
      ? "select i.storage_key, s.user_id from seller_submission_images i join seller_submissions s on s.id=i.submission_id where i.id=$1"
      : kind === "repair"
        ? "select i.storage_key, r.user_id from repair_images i join repair_bookings r on r.id=i.repair_id where i.id=$1"
        : null;
  if (!sql) return new Response("Not found", { status: 404 });
  const row = await queryOne<{ storage_key: string; user_id: string | null }>(sql, [id]);
  if (!row || (user.role !== "admin" && row.user_id !== user.id)) return new Response("Not found", { status: 404 });
  const data = await getObject("private", row.storage_key);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "content-type": "image/webp", "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
  });
}
