import { z } from "zod";
import { publicFormHandler, ok, UserError } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { query, queryOne } from "@/lib/db";
import { notifyAdmin } from "@/lib/notify";

const schema = z.object({ reviewId: z.uuid(), reason: z.string().trim().min(3, "Please tell us what is wrong.").max(1000) });

export async function POST(req: Request) {
  return publicFormHandler(req, { bucket: "report", limit: 5, windowSeconds: 3600 }, async (form) => {
    const d = schema.parse({ reviewId: form.get("reviewId"), reason: form.get("reason") });
    const exists = await queryOne("select 1 from reviews where id=$1 and status='approved'", [d.reviewId]);
    if (!exists) throw new UserError("Review not found.", 404);
    const user = await getCurrentUser();
    await query("insert into review_reports (review_id, reporter_user_id, reason) values ($1,$2,$3)", [d.reviewId, user?.id ?? null, d.reason]);
    await notifyAdmin("review_report", "A review was reported", d.reason.slice(0, 300), "/admin/reviews");
    return ok();
  });
}
