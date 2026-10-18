import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { env } from "./env";

// One pool per server instance. Kept small because free database tiers limit
// connections; use Supabase's transaction pooler URL in production.
const globalForDb = globalThis as unknown as { __g4uPool?: Pool };

export const pool: Pool =
  globalForDb.__g4uPool ??
  new Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__g4uPool = pool;

type Executor = Pick<Pool, "query"> | PoolClient;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client: Executor = pool,
): Promise<T[]> {
  const res = await client.query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client: Executor = pool,
): Promise<T | null> {
  const rows = await query<T>(text, params, client);
  return rows[0] ?? null;
}

export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
