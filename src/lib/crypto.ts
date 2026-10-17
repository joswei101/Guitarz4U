import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Human-friendly reference, e.g. "ORD-7K3MQ9". Uniqueness is enforced by DB constraints. */
export function humanReference(prefix: string, length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `${prefix}-${out}`;
}
