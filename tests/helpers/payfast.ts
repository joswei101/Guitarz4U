import { pfParamString, pfSignature } from "@/lib/payfast";

/** Builds a correctly signed PayFast ITN body, as PayFast's servers would send it. */
export function itnBody(fields: Record<string, string>, passphrase = "jt7NOE43FZPn"): string {
  const pairs: [string, string][] = Object.entries({
    m_payment_id: "",
    pf_payment_id: String(Math.floor(Math.random() * 1e7)),
    payment_status: "COMPLETE",
    item_name: "Guitarz4U order",
    item_description: "",
    amount_gross: "0.00",
    amount_fee: "-2.30",
    amount_net: "0.00",
    custom_str1: "",
    name_first: "Test",
    name_last: "Buyer",
    email_address: "buyer@example.com",
    merchant_id: "10000100",
    ...fields,
  });
  const signature = pfSignature(pfParamString(pairs, { skipEmpty: false }), passphrase);
  return new URLSearchParams([...pairs, ["signature", signature]]).toString();
}

/** Stand-in for PayFast's /eng/query/validate endpoint. */
export const validFetch = (async () => new Response("VALID")) as unknown as typeof fetch;
export const invalidFetch = (async () => new Response("INVALID")) as unknown as typeof fetch;
