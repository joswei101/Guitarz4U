import { z } from "zod";
import { publicFormHandler, ok, UserError } from "@/lib/api";
import { emailSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/session";
import { query, queryOne } from "@/lib/db";

const schema = z.object({ productId: z.uuid(), email: emailSchema });

export async function POST(req: Request) {
  return publicFormHandler(req, { bucket: "alert", limit: 10, windowSeconds: 3600 }, async (form) => {
    const data = schema.parse({ productId: form.get("productId"), email: form.get("email") });
    const product = await queryOne("select 1 from products where id=$1 and status in ('published','reserved')", [data.productId]);
    if (!product) throw new UserError("This guitar is no longer listed.", 404);
    const user = await getCurrentUser();
    await query(
      `insert into availability_alerts (product_id, user_id, email) values ($1,$2,$3)
       on conflict (product_id, email) do update set notified_at = null`,
      [data.productId, user?.id ?? null, data.email],
    );
    return ok();
  });
}
