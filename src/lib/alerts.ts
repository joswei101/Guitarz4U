import { query } from "./db";
import { notifyCustomer } from "./notify";

/** Notifies everyone who asked to hear when these guitars become available again. */
export async function sendAvailabilityAlerts(productIds: string[]) {
  if (productIds.length === 0) return;
  const alerts = await query<{ id: string; email: string; user_id: string | null; title: string; slug: string }>(
    `select a.id, a.email, a.user_id, p.title, p.slug from availability_alerts a join products p on p.id=a.product_id
     where a.product_id = any($1::uuid[]) and a.notified_at is null and p.status='published'`,
    [productIds],
  );
  for (const a of alerts) {
    await notifyCustomer({
      userId: a.user_id,
      email: a.email,
      kind: "availability",
      title: `${a.title} is available again`,
      body: `Good news — "${a.title}" is available at Guitarz4U again. Availability changes quickly, so send a purchase request if you are still interested.`,
      link: `/shop/${a.slug}`,
    });
    await query("update availability_alerts set notified_at=now() where id=$1", [a.id]);
  }
}
