import { queryOne } from "./db";

/**
 * Fixed-window rate limiter stored in Postgres, so it works on serverless hosts
 * where memory is not shared between requests. Returns true if allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (process.env.DISABLE_APP_RATE_LIMIT === "true") return true;
  const row = await queryOne<{ count: number }>(
    `insert into app_rate_limits (key, count, reset_at) values ($1, 1, now() + make_interval(secs => $2))
     on conflict (key) do update set
       count = case when app_rate_limits.reset_at < now() then 1 else app_rate_limits.count + 1 end,
       reset_at = case when app_rate_limits.reset_at < now() then now() + make_interval(secs => $2) else app_rate_limits.reset_at end
     returning count`,
    [key, windowSeconds],
  );
  return (row?.count ?? 0) <= limit;
}
