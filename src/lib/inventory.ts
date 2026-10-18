import type { PoolClient } from "pg";

export const ACTIVE_PURCHASE_HOLD = ["approved", "awaiting_eft", "payment_confirmed", "ready_for_collection"];

/**
 * Puts reserved guitars back on sale, but only when nothing else still holds them
 * (no approved reservation and no other approved purchase request).
 * Returns the ids that were released, so availability alerts can be sent.
 */
export async function releaseIfFree(client: Pick<PoolClient, "query">, productIds: string[], exceptRequestId?: string): Promise<string[]> {
  if (productIds.length === 0) return [];
  const res = await client.query<{ id: string }>(
    `update products p set status='published'
     where p.id = any($1::uuid[]) and p.status='reserved'
       and not exists (select 1 from reservations r where r.product_id=p.id and r.status='approved')
       and not exists (
         select 1 from purchase_request_items i join purchase_requests pr on pr.id=i.purchase_request_id
         where i.product_id=p.id and pr.status = any($2::text[]) and ($3::uuid is null or pr.id <> $3::uuid))
     returning p.id`,
    [productIds, ACTIVE_PURCHASE_HOLD, exceptRequestId ?? null],
  );
  return res.rows.map((r) => r.id);
}
