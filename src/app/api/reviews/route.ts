import { publicFormHandler, formToObject, ok, UserError } from "@/lib/api";
import { reviewSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/session";
import { query, queryOne } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { notifyAdmin } from "@/lib/notify";

export async function POST(req: Request) {
  return publicFormHandler(req, { bucket: "review", limit: 10, windowSeconds: 3600 }, async (form) => {
    const user = await getCurrentUser();
    if (!user) throw new UserError("Please log in to write a review.", 401);
    if (!(await rateLimit(`review-user:${user.id}`, 3, 86400))) throw new UserError("You can submit up to 3 reviews per day.", 429);
    const d = reviewSchema.parse(formToObject(form));
    const pending = await queryOne("select 1 from reviews where user_id=$1 and status='pending'", [user.id]);
    if (pending) throw new UserError("You already have a review waiting for approval. Thank you for your patience!", 409);
    // "Completed purchase" is only shown when our own records show a completed sale for this account.
    const verified = await queryOne("select 1 from purchase_requests where user_id=$1 and status='completed' limit 1", [user.id]);
    await query(
      "insert into reviews (user_id, display_name, rating, title, body, verified_purchase) values ($1,$2,$3,$4,$5,$6)",
      [user.id, d.displayName, d.rating, d.title, d.body, Boolean(verified)],
    );
    await notifyAdmin("review", "New review awaiting approval", `${d.displayName} left a ${d.rating}-star review.`, "/admin/reviews");
    return ok();
  });
}
