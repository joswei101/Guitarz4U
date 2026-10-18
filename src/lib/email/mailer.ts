import nodemailer, { type Transporter } from "nodemailer";
import { env, features } from "../env";

let transporter: Transporter | null = null;

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export interface MailTransport {
  send(email: OutgoingEmail): Promise<{ messageId: string }>;
}

class SmtpTransport implements MailTransport {
  async send(email: OutgoingEmail) {
    if (!transporter) {
      const e = env();
      transporter = nodemailer.createTransport({
        host: e.SMTP_HOST,
        port: e.SMTP_PORT ?? 587,
        secure: e.SMTP_SECURE === "true",
        auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
      });
    }
    const info = await transporter.sendMail({ from: env().EMAIL_FROM, ...email });
    return { messageId: String(info.messageId) };
  }
}

let override: MailTransport | null = null;

/** Returns null when no email provider is configured. */
export function mailTransport(): MailTransport | null {
  if (override) return override;
  return features.email() ? new SmtpTransport() : null;
}

/** Test hook */
export function setMailTransport(t: MailTransport | null) {
  override = t;
}
