"use server";

import { prisma } from "@/lib/db";
import { runAction } from "@/lib/action";
import { contactSchema, emailSchema, formToObject } from "@/lib/validation";
import { clientIp } from "@/lib/http";
import { enforceRateLimit, limits } from "@/lib/rate-limit";
import { humanReference, randomToken, sha256 } from "@/lib/crypto";
import { notifyAdmin, sendEmail } from "@/lib/notify";
import { getCurrentUser } from "@/lib/auth/session";
import type { ActionResult } from "@/lib/errors";

const NEWSLETTER_CONSENT = "I agree to receive occasional emails from Guitarz4U about new stock and services. I can unsubscribe at any time.";

export async function subscribeNewsletter(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await enforceRateLimit(`newsletter:${await clientIp()}`, limits.form.limit, limits.form.window);
    if (form.get("consent") !== "on") return { ok: false, error: "Please tick the consent box to subscribe." };
    if (form.get("website")) return { ok: true, message: "Thanks! Please check your inbox to confirm." };
    const email = emailSchema.parse(form.get("email"));
    const token = randomToken(24);
    const existing = await prisma.newsletterSubscription.findUnique({ where: { email } });
    if (existing?.status === "SUBSCRIBED") return { ok: true, message: "You're already subscribed — thank you!" };
    await prisma.newsletterSubscription.upsert({
      where: { email },
      create: { email, tokenHash: sha256(token), consentText: NEWSLETTER_CONSENT, consentAt: new Date() },
      update: { tokenHash: sha256(token), status: "PENDING", consentText: NEWSLETTER_CONSENT, consentAt: new Date() },
    });
    await sendEmail("newsletterConfirm", email, { token });
    return { ok: true, message: "Thanks! Please check your inbox and click the link to confirm your subscription." };
  });
}

export async function submitContact(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await enforceRateLimit(`contact:${await clientIp()}`, limits.form.limit, limits.form.window);
    const data = contactSchema.parse(formToObject(form));
    const user = await getCurrentUser();
    const reference = humanReference("MSG", 6);
    await prisma.contactEnquiry.create({
      data: {
        reference,
        userId: user?.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        subject: data.subject,
        message: data.message,
        isSupport: form.get("support") === "1",
        privacyConsentAt: new Date(),
      },
    });
    await sendEmail("contactReceived", data.email, { name: data.name, reference }, user?.id);
    await notifyAdmin("New contact message", [["From", `${data.name} <${data.email}>`], ["Subject", data.subject], ["Reference", reference]], "/admin/messages");
    return { ok: true, message: `Thanks, ${data.name.split(" ")[0]} — your message has been received (reference ${reference}). We'll reply by email or WhatsApp.` };
  });
}
