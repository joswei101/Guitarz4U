import { NextResponse, type NextRequest } from 'next/server';
import { getProfile, profileHasPerm } from '@/lib/auth';
import { DATASETS, toCsv } from '@/lib/exports';
import { createClient } from '@/lib/supabase/server';

// Admin data export. Checks permission here AND relies on row-level security,
// because the query runs as the signed-in staff member.
async function fetchAll(table: string, order: string) {
  const supabase = await createClient();
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table as never).select('*').order(order as never).range(from, from + 999);
    if (error || !data?.length) break;
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < 1000) break;
  }
  return rows;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await params;
  const profile = await getProfile();
  if (!profile || profile.is_blocked || !['owner', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  const date = new Date().toISOString().slice(0, 10);
  const headers = (name: string, type: string) => ({
    'content-type': type, 'cache-control': 'no-store',
    'content-disposition': `attachment; filename="guitarz4u-${name}-${date}.${type.includes('json') ? 'json' : 'csv'}"`,
  });

  if (dataset === 'full') {
    const out: Record<string, unknown> = { exported_at: new Date().toISOString(), exported_by: profile.email };
    for (const [key, d] of Object.entries(DATASETS)) {
      if (profileHasPerm(profile, d.perm)) out[key] = await fetchAll(d.table, d.order);
    }
    return new NextResponse(JSON.stringify(out, null, 1), { headers: headers('backup', 'application/json; charset=utf-8') });
  }
  const d = DATASETS[dataset];
  if (!d || !profileHasPerm(profile, d.perm)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  const rows = await fetchAll(d.table, d.order);
  return new NextResponse(toCsv(rows), { headers: headers(dataset, 'text/csv; charset=utf-8') });
}
