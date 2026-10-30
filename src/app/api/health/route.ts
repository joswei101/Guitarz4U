import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple health check: confirms the website can reach the database.
// Also used by the optional keep-alive GitHub Action so the free Supabase
// project is not paused for inactivity.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('settings').select('id').eq('id', 1).single();
    if (error) throw error;
    await supabase.rpc('expire_reservations');
    return NextResponse.json({ ok: true, database: 'connected', time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, database: 'unreachable' }, { status: 503 });
  }
}
