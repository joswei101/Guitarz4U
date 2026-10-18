import { env, features } from "./env";
import { logger } from "./logger";

/**
 * Official WhatsApp Business Cloud API (Meta). Business-initiated messages must use templates
 * that the owner has created and had approved in WhatsApp Manager. Nothing here simulates delivery.
 */
export function toE164ZA(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return `27${digits.slice(1)}`;
  if (/^27\d{9}$/.test(digits)) return digits;
  return null;
}

export async function sendWhatsAppTemplate(
  to: string,
  template: string,
  bodyParams: string[],
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  if (!features.whatsapp()) return { ok: false, error: "not_configured" };
  const number = toE164ZA(to);
  if (!number) return { ok: false, error: "invalid_number" };
  const e = env();
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${e.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${e.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: number,
        type: "template",
        template: {
          name: template,
          language: { code: e.WHATSAPP_TEMPLATE_LANGUAGE },
          components: [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok || !json.messages?.[0]?.id) return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, messageId: json.messages[0].id };
  } catch (err) {
    logger.warn("WhatsApp send failed", { err });
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
