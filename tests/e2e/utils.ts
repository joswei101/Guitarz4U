import { expect, type Page } from '@playwright/test';
// @ts-expect-error — plain JS helper shared with the database tests
import * as h from '../helpers.mjs';

export const helpers = h as {
  admin: import('@supabase/supabase-js').SupabaseClient;
  psql: (sql: string) => string;
  makeUser: (label: string, role?: string, perms?: string[]) => Promise<{ id: string; email: string }>;
  PASSWORD: string;
  unique: () => string;
};

/** Real people take a few seconds to fill a form; the spam check rejects instant submissions. */
export const humanPause = (page: Page) => page.waitForTimeout(2700);

export async function dismissCookies(page: Page) {
  const btn = page.getByRole('button', { name: 'Essential only' });
  if (await btn.isVisible().catch(() => false)) await btn.click();
}

export async function login(page: Page, email: string, password = helpers.PASSWORD) {
  // The site limits sign-in attempts per IP address (brute-force protection).
  // The test suite signs in many times from one machine, so it clears the
  // LOCAL counters first; production limits are unchanged.
  helpers.psql('delete from public.rate_limits');
  await page.goto('/auth/login');
  await dismissCookies(page);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await humanPause(page);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/account/);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

/** Reads the latest email sent to an address from the local Mailpit inbox. */
export async function latestEmail(to: string, subjectIncludes?: string, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const json = (await res.json()) as { messages: { ID: string; Subject: string }[] };
    const msg = json.messages?.find((m) => !subjectIncludes || m.Subject.includes(subjectIncludes));
    if (msg) {
      const full = (await (await fetch(`http://127.0.0.1:54324/api/v1/message/${msg.ID}`)).json()) as { Text: string; HTML: string; Subject: string };
      return full;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email to ${to}${subjectIncludes ? ` with subject containing "${subjectIncludes}"` : ''}`);
}

/** A small, valid PNG photo for upload tests (generated, not a real guitar photo). */
export function testPng(): { name: string; mimeType: string; buffer: Buffer } {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAeklEQVR4nO3PUQkAIBTAwBfHTAYzryH8OITBAtzm7PV1wwUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWNKAFDWhBA1rQgBY0oAUNaEEDWtCAFjSgBQ1oQQNa0IAWPHYBzuGBAG4dgbkAAAAASUVORK5CYII=';
  return { name: 'test-photo.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') };
}
