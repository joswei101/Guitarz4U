import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { DATASETS } from "../datasets";

async function assertAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  return profile?.role === "admin" ? supabase : null;
}

/** Fetches all rows of a table in pages (PostgREST returns max 1000 rows per request). */
async function fetchAll(supabase: NonNullable<Awaited<ReturnType<typeof assertAdmin>>>, key: string) {
  const ds = DATASETS[key];
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; from < 200_000; from += 1000) {
    let q = supabase.from(ds.table).select(ds.select).range(from, from + 999);
    if (ds.filter) q = q.eq(ds.filter[0], ds.filter[1]);
    if (ds.order) q = q.order(ds.order, { ascending: true });
    const { data, error } = await q;
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
  }
  // Flatten one level of nested objects (e.g. brand.name -> brand_name)
  return rows.map((r) => {
    const flat: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      if (v && typeof v === "object" && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) flat[`${k}_${k2}`] = v2;
      else flat[k] = v;
    }
    return flat;
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await params;
  const supabase = await assertAdmin();
  if (!supabase) return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  const stamp = new Date().toISOString().slice(0, 10);

  try {
    if (dataset === "backup.json") {
      const backup: Record<string, unknown> = { exported_at: new Date().toISOString(), note: "Guitarz4U data backup (JSON). Restore instructions: docs/BACKUP-AND-RESTORE.md" };
      for (const key of Object.keys(DATASETS)) {
        if (key === "sold-products") continue;
        const ds = DATASETS[key];
        const rows: unknown[] = [];
        for (let from = 0; from < 200_000; from += 1000) {
          const { data, error } = await supabase.from(ds.table).select("*").range(from, from + 999);
          if (error) throw error;
          rows.push(...(data ?? []));
          if (!data || data.length < 1000) break;
        }
        backup[ds.table] = rows;
      }
      for (const table of ["categories", "brands", "product_private", "seller_submission_images", "repair_images", "site_settings", "data_requests", "review_reports", "availability_alerts", "wishlists"]) {
        const { data } = await supabase.from(table).select("*").limit(50_000);
        backup[table] = data ?? [];
      }
      return new NextResponse(JSON.stringify(backup, null, 1), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="guitarz4u-backup-${stamp}.json"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (!DATASETS[dataset]) return NextResponse.json({ error: "Unknown dataset" }, { status: 404 });
    const rows = await fetchAll(supabase, dataset);
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="guitarz4u-${dataset}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export failed", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
