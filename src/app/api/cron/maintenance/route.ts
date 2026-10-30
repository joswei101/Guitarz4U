import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { retryEmail } from '@/lib/notify';

// Called by the optional GitHub Action (.github/workflows/maintenance.yml).
// Requires "Authorization: Bearer <CRON_SECRET>". Safe to run repeatedly.
export const dynamic = 'force-dynamic';

function authorised(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!secret || secret.length < 16 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const admin = createAdminClient();
  const { data: expired } = await admin.rpc('expire_reservations');
  // Retry emails that failed fewer than 3 times in the last 2 days.
  const { data: failed } = await admin.from('email_outbox').select('id').eq('status', 'failed').lt('attempts', 3)
    .gte('created_at', new Date(Date.now() - 2 * 86400000).toISOString()).limit(20);
  let retried = 0;
  for (const f of failed ?? []) if ((await retryEmail(f.id)) === 'sent') retried++;
  await admin.from('rate_limits').delete().lt('window_start', new Date(Date.now() - 2 * 86400000).toISOString());
  return NextResponse.json({ ok: true, expired_reservations: expired ?? 0, emails_retried: retried });
}
