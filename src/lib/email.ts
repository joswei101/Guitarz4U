import "server-only";
import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/env";

/**
 * Email "outbox". Database triggers create notifications; email-worthy ones
 * start with email_status = 'pending'. After any action that may have created
 * notifications we call flushEmailOutbox(), which:
 *   - sends pending emails via SMTP when SMTP + SUPABASE_SECRET_KEY are set
 *   - otherwise leaves them pending, and the dashboard honestly shows
 *     "email not sent" with a manual WhatsApp/email option.
 * A status of 'sent' is only recorded after the SMTP server accepts the message.
 */

export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.EMAIL_FROM &&
      (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
  );
}

function transporter() {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function render(title: string, body: string, link: string | null) {
  const url = link ? `${SITE_URL}${link}` : SITE_URL;
  const text = `${title}\n\n${body}\n\nView it here: ${url}\n\n— Guitarz4U\nSecond-hand equipment, first-hand service.`;
  const html = `<div style="font-family:Georgia,serif;background:#F5EBD8;padding:24px;color:#38271F">
  <div style="max-width:560px;margin:0 auto;background:#FFF9EE;border:1px solid #B08A52;border-radius:8px;padding:24px">
    <p style="margin:0 0 4px;font-size:20px;font-weight:bold">Guitarz4U</p>
    <p style="margin:0 0 20px;font-size:12px;color:#806044">Second-hand equipment, first-hand service.</p>
    <h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(title)}</h1>
    <p style="white-space:pre-line;font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${escapeHtml(body)}</p>
    <p><a href="${escapeHtml(url)}" style="display:inline-block;background:#38271F;color:#FFF9EE;padding:10px 16px;border-radius:6px;text-decoration:none;font-family:Arial,sans-serif;font-size:14px">View details</a></p>
    <p style="font-size:12px;color:#806044;font-family:Arial,sans-serif">No payment has been taken. Guitarz4U never asks for card details by email.</p>
  </div></div>`;
  return { text, html };
}

export async function flushEmailOutbox(limit = 20) {
  if (!isEmailConfigured()) return { sent: 0, skipped: true };
  const admin = createAdminClient();
  if (!admin) return { sent: 0, skipped: true };

  const { data: pending } = await admin
    .from("notifications")
    .select("id, audience, user_id, title, body, link")
    .eq("email_status", "pending")
    .gte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString())
    .order("created_at")
    .limit(limit);
  if (!pending?.length) return { sent: 0, skipped: false };

  const mailer = transporter();
  let sent = 0;
  for (const n of pending) {
    // Claim the row first so two parallel requests do not double-send.
    const { data: claimed } = await admin
      .from("notifications")
      .update({ email_status: "failed", email_error: "sending" })
      .eq("id", n.id)
      .eq("email_status", "pending")
      .select("id");
    if (!claimed?.length) continue;

    let to: string | null = null;
    if (n.audience === "admin") {
      to = process.env.ADMIN_NOTIFICATION_EMAIL || null;
    } else if (n.user_id) {
      const { data } = await admin.from("profiles").select("email").eq("id", n.user_id).maybeSingle();
      to = data?.email ?? null;
    }
    if (!to) {
      await admin
        .from("notifications")
        .update({ email_status: "not_configured", email_error: "No recipient email address" })
        .eq("id", n.id);
      continue;
    }
    try {
      const { text, html } = render(n.title, n.body, n.link);
      await mailer.sendMail({ from: process.env.EMAIL_FROM, to, subject: n.title, text, html });
      await admin
        .from("notifications")
        .update({ email_status: "sent", email_error: null, emailed_at: new Date().toISOString() })
        .eq("id", n.id);
      sent++;
    } catch (err) {
      await admin
        .from("notifications")
        .update({ email_status: "failed", email_error: String((err as Error).message).slice(0, 300) })
        .eq("id", n.id);
    }
  }
  return { sent, skipped: false };
}

/** Never let email problems break the user's action. */
export async function safeFlush() {
  try {
    await flushEmailOutbox();
  } catch (err) {
    console.error("Email outbox flush failed", err);
  }
}
