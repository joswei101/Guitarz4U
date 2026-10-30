import 'server-only';
import { cookies } from 'next/headers';

// The enquiry cart is a small essential cookie holding product IDs only.
const CART_COOKIE = 'g4u_cart';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readCart(): Promise<string[]> {
  const store = await cookies();
  const raw = store.get(CART_COOKIE)?.value ?? '';
  return [...new Set(raw.split('.').filter((id) => UUID.test(id)))].slice(0, 10);
}

export async function writeCart(ids: string[]) {
  const store = await cookies();
  const clean = [...new Set(ids.filter((id) => UUID.test(id)))].slice(0, 10);
  store.set(CART_COOKIE, clean.join('.'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}
