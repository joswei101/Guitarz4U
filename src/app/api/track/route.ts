import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit, anonymisedIp } from '@/lib/guard';

// Privacy-friendly analytics: increments daily counters only. No cookies are
// set, and no IP address or personal data is stored. Bots are ignored.
const BOT = /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse/i;

export async function POST(request: NextRequest) {
  if (BOT.test(request.headers.get('user-agent') ?? '')) return new NextResponse(null, { status: 204 });
  let body: { path?: unknown; productId?: unknown };
  try { body = await request.json(); } catch { return new NextResponse(null, { status: 400 }); }
  if (!(await rateLimit(`track:${await anonymisedIp()}`, 120, 3600))) return new NextResponse(null, { status: 204 });
  const admin = createAdminClient();
  if (typeof body.productId === 'string' && /^[0-9a-f-]{36}$/i.test(body.productId)) {
    await admin.rpc('track_product_view', { p_product_id: body.productId });
  } else if (typeof body.path === 'string' && /^\/[\w\-/]{0,150}$/.test(body.path)) {
    const path = body.path.replace(/\/[0-9a-f-]{36}/gi, '/:id');
    if (!/^\/(account|admin|auth|api)/.test(path)) await admin.rpc('track_page_view', { p_path: path });
  }
  return new NextResponse(null, { status: 204 });
}
