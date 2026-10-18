import type { PoolClient } from "pg";
import { pool } from "./db";
import type { CurrentUser } from "./session";

/** Records an administrator (or system) action in the append-only audit log. */
export async function audit(
  actor: Pick<CurrentUser, "id" | "email"> | null,
  action: string,
  entityType = "",
  entityId = "",
  details: Record<string, unknown> = {},
  client: Pick<PoolClient, "query"> = pool,
) {
  await client.query(
    "insert into audit_logs (actor_id, actor_email, action, entity_type, entity_id, details) values ($1,$2,$3,$4,$5,$6)",
    [actor?.id ?? null, actor?.email ?? null, action, entityType, entityId, JSON.stringify(details)],
  );
}
