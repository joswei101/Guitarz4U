import type { PoolClient } from "pg";
import { pool, query } from "./db";

export type EntityType = "purchase_request" | "reservation" | "seller_submission" | "repair_booking";

/** Adds an entry to the customer-visible status timeline. */
export async function addHistory(
  entityType: EntityType,
  entityId: string,
  status: string,
  publicNote = "",
  actorId: string | null = null,
  client: Pick<PoolClient, "query"> = pool,
) {
  await client.query(
    "insert into status_history (entity_type, entity_id, status, public_note, actor_id) values ($1,$2,$3,$4,$5)",
    [entityType, entityId, status, publicNote, actorId],
  );
}

export async function getHistory(entityType: EntityType, entityId: string) {
  return query<{ status: string; public_note: string; created_at: Date }>(
    "select status, public_note, created_at from status_history where entity_type=$1 and entity_id=$2 order by created_at, id",
    [entityType, entityId],
  );
}
