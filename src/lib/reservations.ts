import { transaction } from "./db";
import { addHistory } from "./workflow";
import { releaseIfFree } from "./inventory";
import { sendAvailabilityAlerts } from "./alerts";

let lastRun = 0;

/** Expires approved reservations whose hold period has passed and releases the guitars. */
export async function expireOverdueReservations(force = false) {
  // Runs at most every 5 minutes per server instance; called from shop and admin pages.
  if (!force && Date.now() - lastRun < 5 * 60_000) return;
  lastRun = Date.now();
  const released = await transaction(async (c) => {
    const rows = (await c.query<{ id: string; product_id: string }>(
      "update reservations set status='expired' where status='approved' and expires_at < now() returning id, product_id",
    )).rows;
    for (const r of rows) await addHistory("reservation", r.id, "expired", "The reservation period has ended.", null, c);
    return rows.length ? releaseIfFree(c, rows.map((r) => r.product_id)) : [];
  });
  await sendAvailabilityAlerts(released);
}

