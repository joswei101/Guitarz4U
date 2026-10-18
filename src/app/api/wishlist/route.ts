import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { isSameOrigin, jsonError } from "@/lib/http";
import { query, queryOne } from "@/lib/db";
import { ok } from "@/lib/api";

const schema = z.object({ productId: z.uuid(), saved: z.boolean() });

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("Invalid request origin.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in to use your wishlist.", 401);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request.");
  const { productId, saved } = parsed.data;
  if (saved) {
    const exists = await queryOne("select 1 from products where id=$1 and status in ('published','reserved')", [productId]);
    if (!exists) return jsonError("This guitar is no longer available.", 404);
    await query("insert into wishlists (user_id, product_id) values ($1,$2) on conflict do nothing", [user.id, productId]);
  } else {
    await query("delete from wishlists where user_id=$1 and product_id=$2", [user.id, productId]);
  }
  return ok();
}
