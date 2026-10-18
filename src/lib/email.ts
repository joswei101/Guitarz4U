import nodemailer from "nodemailer";
import { env, features } from "./env";

export type EmailResult = { status: "sent" | "failed" | "not_configured"; error?: string };

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Sends a plain, branded email. Only reports "sent" when the SMTP server
 * accepted the message — never assumes delivery.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  actionUrl?: string;
  actionLabel?: string;
}): Promise<EmailResult> {
  if (!features.email) return { status: "not_configured" };
  const action = opts.actionUrl
    ? `<p style="margin:24px 0"><a href="${escapeHtml(opts.actionUrl)}" style="background:#38271F;color:#F5EBD8;padding:12px 20px;text-decoration:none;border-radius:4px">${escapeHtml(opts.actionLabel || "Open")}</a></p>`
    : "";
  const html = `<div style="font-family:Arial,sans-serif;background:#F5EBD8;padding:24px;color:#241A16">
<div style="max-width:560px;margin:auto;background:#FFF9EE;padding:24px;border:1px solid #B08A52">
<h2 style="font-family:Georgia,serif;color:#38271F;margin-top:0">Guitarz4U</h2>
${opts.text.split("\n").map((l) => `<p style="margin:0 0 10px">${escapeHtml(l)}</p>`).join("")}
${action}
<p style="font-size:12px;color:#806044;margin-top:24px">Guitarz4U · Sandringham, Johannesburg · Second-hand equipment, first-hand service.<br>Guitarz4U never asks for card details or banking passwords.</p>
</div></div>`;
  try {
    await getTransporter().sendMail({
      from: env.smtp.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text + (opts.actionUrl ? `\n\n${opts.actionLabel || "Open"}: ${opts.actionUrl}` : ""),
      html,
    });
    return { status: "sent" };
  } catch (err) {
    console.error("[email] send failed", err);
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}
