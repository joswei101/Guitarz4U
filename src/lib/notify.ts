import { prisma } from "./db";
import { env } from "./env";
import { logger } from "./logger";
import { site } from "./site";
import { renderEmail } from "./email/layout";
import { mailTransport } from "./email/mailer";
import { templates, type TemplateName } from "./email/templates";
import { sendWhatsAppTemplate } from "./whatsapp";

type TemplateData<T extends TemplateName> = Parameters<(typeof templates)[T]>[0];

/**
 * Sends a transactional email and records the outcome. Never throws: a failed or unconfigured
 * email must not break the customer's action. Status is recorded truthfully
 * (SENT only when the provider accepted the message).
 */
export async function sendEmail<T extends TemplateName>(template: T, to: string, data: TemplateData<T>, userId?: string | null): Promise<boolean> {
  const content = renderEmail((templates[template] as (d: TemplateData<T>) => Parameters<typeof renderEmail>[0])(data));
  const record = await prisma.notification.create({
    data: { userId: userId ?? null, channel: "EMAIL", template, recipient: to, subject: content.subject },
  });
  const transport = mailTransport();
  if (!transport) {
    await prisma.notification.update({ where: { id: record.id }, data: { status: "SKIPPED_NOT_CONFIGURED" } });
    // In development, print the email so links (verification, reset) can still be followed.
    if (env().NODE_ENV !== "production") logger.info("Email not sent (SMTP not configured)", { to, subject: content.subject, text: content.text });
    else logger.warn("Email not sent: SMTP not configured", { template });
    return false;
  }
  try {
    const { messageId } = await transport.send({ to, subject: content.subject, html: content.html, text: content.text, replyTo: site.email });
    await prisma.notification.update({ where: { id: record.id }, data: { status: "SENT", sentAt: new Date(), providerMessageId: messageId } });
    return true;
  } catch (err) {
    logger.error("Email send failed", { template, err });
    await prisma.notification.update({ where: { id: record.id }, data: { status: "FAILED", error: err instanceof Error ? err.message.slice(0, 500) : "unknown" } });
    return false;
  }
}

export function adminEmail(): string {
  return env().ADMIN_NOTIFICATION_EMAIL ?? site.email;
}

export function notifyAdmin(title: string, lines: [string, string][], path: string) {
  return sendEmail("adminAlert", adminEmail(), { title, lines, path });
}

/**
 * Optional automated WhatsApp status message. Only sent when the official integration is configured
 * AND the customer explicitly opted in. Outcome recorded truthfully.
 */
export async function sendWhatsAppUpdate(userId: string | null, phone: string | null, template: string, params: string[]): Promise<void> {
  if (!userId || !phone) return;
  const profile = await prisma.customerProfile.findUnique({ where: { userId }, select: { whatsappOptIn: true } });
  const record = await prisma.notification.create({ data: { userId, channel: "WHATSAPP", template, recipient: phone } });
  if (!profile?.whatsappOptIn) {
    await prisma.notification.update({ where: { id: record.id }, data: { status: "SKIPPED_NO_CONSENT" } });
    return;
  }
  const result = await sendWhatsAppTemplate(phone, template, params);
  if (result.ok) {
    await prisma.notification.update({ where: { id: record.id }, data: { status: "SENT", sentAt: new Date(), providerMessageId: result.messageId } });
  } else {
    await prisma.notification.update({
      where: { id: record.id },
      data: { status: result.error === "not_configured" ? "SKIPPED_NOT_CONFIGURED" : "FAILED", error: result.error.slice(0, 500) },
    });
  }
}
