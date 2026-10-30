import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Sign-out must be a POST (from a form), so other websites cannot sign people out with a link.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/?ok=' + encodeURIComponent('You have been signed out.'), request.nextUrl.origin), { status: 303 });
}
