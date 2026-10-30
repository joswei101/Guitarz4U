import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Spam protection for public forms:
 *  1. Honeypot: a hidden "website" field that people never fill in, but bots do.
 *  2. Timing: forms submitted faster than a person could type are rejected.
 *  3. Rate limit: per anonymised IP address, stored in the database.
 *  4. Optional Cloudflare Turnstile check, if keys are configured.
 */
export async function guardSubmission(
  formData: FormData,
  action: string,
  opts: { max: number; windowSeconds: number },
): Promise<string | null> {
  if (String(formData.get('website') ?? '').trim() !== '') return 'Submission blocked.';

  const startedAt = Number(formData.get('_ts') ?? 0);
  if (startedAt && Date.now() - startedAt < 2500) return 'That was very quick — please check the form and try again.';

  const ipKey = await anonymisedIp();
  const allowed = await rateLimit(`${action}:${ipKey}`, opts.max, opts.windowSeconds);
  if (!allowed) return 'Too many submissions. Please wait a while, or contact us on WhatsApp.';

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (secret) {
    const token = String(formData.get('cf-turnstile-response') ?? '');
    if (!token) return 'Please complete the spam check.';
    try {
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: new URLSearchParams({ secret, response: token }),
      });
      const json = (await res.json()) as { success?: boolean };
      if (!json.success) return 'The spam check failed. Please try again.';
    } catch {
      return 'The spam check could not be completed. Please try again.';
    }
  }
  return null;
}

export async function anonymisedIp(): Promise<string> {
  const h = await headers();
  const ip =
    h.get('x-nf-client-connection-ip') ??
    h.get('cf-connecting-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'unknown';
  const salt = process.env.IP_HASH_SALT ?? 'guitarz4u';
  return createHash('sha256').update(salt + ip).digest('hex').slice(0, 32);
}

export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_key: key, p_max: max, p_window_seconds: windowSeconds,
    });
    if (error) return true; // fail open: never lock real customers out because of a counter error
    return data === true;
  } catch {
    return true;
  }
}
