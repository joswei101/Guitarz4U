import { query } from "@/lib/db";

// Lightweight health check (also used by the keep-alive workflow so the free
// database is not paused for inactivity).
export async function GET() {
  try {
    await query("select 1");
    return Response.json({ ok: true, database: "up" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, database: "down" }, { status: 503 });
  }
}
