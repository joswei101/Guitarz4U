import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles the return from Google sign-in, email confirmation links and
// password reset links (Supabase "PKCE" flow).
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next') ?? '/account';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/account';
  const errorDescription = url.searchParams.get('error_description');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const message = errorDescription
    ? 'Sign-in was cancelled or failed. Please try again.'
    : 'That link is invalid or has expired. Please request a new one, and open it in the same browser you used to request it.';
  return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(message)}`, url.origin));
}
