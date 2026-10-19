import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { SITE_URL } from "@/lib/env";

// Optional email notifications via any SMTP provider (e.g. a Gmail app
// password or Brevo's free SMTP plan). If SMTP is not configured, the site
// relies on in-app notifications only and never claims an email was sent.

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

let transporter: Transporter | null = null;
function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export type EmailResult = { sent: boolean; reason?: string };

/** Sends a plain notification email. Returns sent=true only if the SMTP server accepted it. */
export async function sendEmail(to: string | null | undefined, subject: string, text: string, linkPath?: string): Promise<EmailResult> {
  const t = getTransporter();
  if (!t) return { sent: false, reason: "not_configured" };
  if (!to) return { sent: false, reason: "no_recipient" };
  const link = linkPath ? `${SITE_URL}${linkPath}` : SITE_URL;
  try {
    const info = await t.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: `Guitarz4U: ${subject}`,
      text: `${text}\n\nView it here: ${link}\n\n— Guitarz4U\nSecond-hand equipment, first-hand service.\nGuitarz4U never asks for card details or banking passwords by email.`,
      html: `<div style="font-family:Arial,sans-serif;color:#2a1d16;max-width:560px">
        <h2 style="font-family:Georgia,serif;color:#38271F">${escapeHtml(subject)}</h2>
        <p style="white-space:pre-line">${escapeHtml(text)}</p>
        <p><a href="${escapeHtml(link)}" style="background:#38271F;color:#FFF9EE;padding:10px 18px;border-radius:999px;text-decoration:none">View on Guitarz4U</a></p>
        <p style="font-size:12px;color:#806044">Guitarz4U never asks for card details or banking passwords by email.</p>
      </div>`,
    });
    return { sent: Array.isArray(info.accepted) && info.accepted.length > 0 };
  } catch (error) {
    console.error("Email sending failed", error);
    return { sent: false, reason: "send_failed" };
  }
}

/** Notifies the owner by email, if configured. */
export async function emailAdmin(subject: string, text: string, linkPath?: string) {
  return sendEmail(process.env.ADMIN_NOTIFICATION_EMAIL, subject, text, linkPath);
}
