import { createHash } from "crypto";
import { env } from "./env";
import { safeEqual } from "./crypto";

/**
 * PayFast (https://payfast.io) — South African payment gateway supporting card payments in ZAR.
 * Implements: signed payment requests, ITN (Instant Transaction Notification) signature
 * verification, merchant/amount checks and server-to-server confirmation.
 */

export const PAYFAST_HOSTS = { sandbox: "sandbox.payfast.co.za", live: "www.payfast.co.za" } as const;

export function payfastProcessUrl(): string {
  return `https://${PAYFAST_HOSTS[env().PAYFAST_MODE]}/eng/process`;
}

/** PHP-style urlencode (spaces as "+", uppercase hex) — PayFast signatures are calculated this way. */
export function pfEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%20/g, "+");
}

/** Builds "k=v&k2=v2" from ordered pairs, skipping empty values and the signature itself. */
export function pfParamString(pairs: [string, string][], opts: { skipEmpty: boolean }): string {
  return pairs
    .filter(([k, v]) => k !== "signature" && (!opts.skipEmpty || v.trim() !== ""))
    .map(([k, v]) => `${k}=${pfEncode(v.trim())}`)
    .join("&");
}

export function pfSignature(paramString: string, passphrase?: string): string {
  const withPass = passphrase ? `${paramString}&passphrase=${pfEncode(passphrase.trim())}` : paramString;
  return createHash("md5").update(withPass).digest("hex");
}

export interface PaymentRequest {
  reference: string;
  amount: string; // "1234.50"
  itemName: string;
  itemDescription?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  customStr1?: string;
}

/** Returns the ordered, signed form fields to POST to PayFast. Card-only (payment_method=cc). */
export function buildPaymentForm(req: PaymentRequest): { action: string; fields: [string, string][] } {
  const e = env();
  if (!e.PAYFAST_MERCHANT_ID || !e.PAYFAST_MERCHANT_KEY) throw new Error("PayFast is not configured");
  // Field order matters for the signature and must follow PayFast's documented attribute order.
  const ordered: [string, string | undefined][] = [
    ["merchant_id", e.PAYFAST_MERCHANT_ID],
    ["merchant_key", e.PAYFAST_MERCHANT_KEY],
    ["return_url", req.returnUrl],
    ["cancel_url", req.cancelUrl],
    ["notify_url", req.notifyUrl],
    ["name_first", req.firstName?.slice(0, 100)],
    ["name_last", req.lastName?.slice(0, 100)],
    ["email_address", req.email.slice(0, 100)],
    ["m_payment_id", req.reference],
    ["amount", req.amount],
    ["item_name", req.itemName.slice(0, 100)],
    ["item_description", req.itemDescription?.slice(0, 255)],
    ["custom_str1", req.customStr1],
    ["payment_method", "cc"],
  ];
  const fields = ordered.filter((p): p is [string, string] => typeof p[1] === "string" && p[1].trim() !== "").map(([k, v]) => [k, v.trim()] as [string, string]);
  const signature = pfSignature(pfParamString(fields, { skipEmpty: true }), e.PAYFAST_PASSPHRASE);
  return { action: payfastProcessUrl(), fields: [...fields, ["signature", signature]] };
}

/** Parses an x-www-form-urlencoded ITN body preserving field order. */
export function parseItnBody(body: string): [string, string][] {
  const params = new URLSearchParams(body);
  return [...params.entries()];
}

export function verifyItnSignature(pairs: [string, string][], passphrase?: string): boolean {
  const received = pairs.find(([k]) => k === "signature")?.[1];
  if (!received) return false;
  // ITN signature covers all posted fields (in received order) except the signature, including empty ones.
  const expected = pfSignature(pfParamString(pairs, { skipEmpty: false }), passphrase);
  return safeEqual(expected, received.toLowerCase());
}

export type ItnValidation =
  | { ok: true; data: Record<string, string> }
  | { ok: false; reason: "bad_signature" | "merchant_mismatch" | "server_rejected" | "server_unreachable" };

/**
 * Full ITN validation: signature, merchant id, and confirmation directly with PayFast.
 * Amount checks are done by the caller against the stored payment.
 */
export async function validateItn(rawBody: string, fetchImpl: typeof fetch = fetch): Promise<ItnValidation> {
  const e = env();
  const pairs = parseItnBody(rawBody);
  const data = Object.fromEntries(pairs);
  if (!verifyItnSignature(pairs, e.PAYFAST_PASSPHRASE)) return { ok: false, reason: "bad_signature" };
  if (data.merchant_id !== e.PAYFAST_MERCHANT_ID) return { ok: false, reason: "merchant_mismatch" };
  if (e.PAYFAST_VALIDATE_WITH_SERVER === "true") {
    try {
      const res = await fetchImpl(`https://${PAYFAST_HOSTS[e.PAYFAST_MODE]}/eng/query/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: pfParamString(pairs, { skipEmpty: false }),
        signal: AbortSignal.timeout(15_000),
      });
      const text = (await res.text()).trim();
      if (text !== "VALID") return { ok: false, reason: "server_rejected" };
    } catch {
      return { ok: false, reason: "server_unreachable" };
    }
  }
  return { ok: true, data };
}

export function amountsMatch(gross: string | undefined, expectedCents: number): boolean {
  if (!gross) return false;
  const cents = Math.round(Number(gross) * 100);
  return Number.isFinite(cents) && Math.abs(cents - expectedCents) <= 1;
}
