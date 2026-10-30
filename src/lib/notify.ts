import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_URL } from '@/lib/env';
import type { Permission } from '@/lib/labels';

/**
 * Notifications are stored in the database first, then delivered:
 *  - In-app notifications appear in the customer's account or admin dashboard.
 *  - Emails go through an "outbox" table that records the REAL outcome:
 *    sent, failed (with the error) or skipped (email not configured / opted out).
 *  - A dedupe key stops the same notification being created twice.
 * WhatsApp messages are never sent automatically (see lib/whatsapp.ts).
 */

type EmailInput = {
  to: string;
  subject: string;
  text: string;
  dedupeKey?: string;
  relatedType?: string;
  relatedId?: string;
};

let transporter: Transporter | null = null;

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }
  return transporter;
}

function footer() {
  return `\n\n—\nGuitarz4U · Sandringham, Johannesburg\n${SITE_URL}\n\nThis website does not take payments. Never pay into account details that did not come directly from the owner. If in doubt, confirm on WhatsApp: 064 856 7019.`;
}

function toHtml(text: string) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const linked = esc.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:Georgia,serif;color:#241608;line-height:1.55;max-width:560px">${linked.replace(/\n/g, '<br>')}</div>`;
}

/** Queue an email in the outbox and try to send it immediately. */
export async function sendEmail(input: EmailInput): Promise<'sent' | 'failed' | 'skipped' | 'duplicate'> {
  const admin = createAdminClient();
  const body = input.text + footer();
  const { data: row, error } = await admin
    .from('email_outbox')
    .insert({
      to_email: input.to,
      subject: input.subject,
      body_text: body,
      dedupe_key: input.dedupeKey ?? null,
      related_type: input.relatedType ?? null,
      related_id: input.relatedId ?? null,
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') return 'duplicate';
    console.error('Could not queue email:', error.message);
    return 'failed';
  }
  return deliver(row.id, input.to, input.subject, body);
}

async function deliver(id: string, to: string, subject: string, body: string) {
  const admin = createAdminClient();
  const t = getTransporter();
  if (!t) {
    await admin.from('email_outbox')
      .update({ status: 'skipped', error: 'Email (SMTP) is not configured.' })
      .eq('id', id);
    return 'skipped' as const;
  }
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM ?? 'Guitarz4U <no-reply@example.com>',
      to,
      subject,
      text: body,
      html: toHtml(body),
    });
    await admin.from('email_outbox')
      .update({ status: 'sent', sent_at: new Date().toISOString(), error: null })
      .eq('id', id);
    return 'sent' as const;
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 500) : 'Unknown error';
    const { data } = await admin.from('email_outbox').select('attempts').eq('id', id).single();
    await admin.from('email_outbox')
      .update({ status: 'failed', error: message, attempts: (data?.attempts ?? 0) + 1 })
      .eq('id', id);
    return 'failed' as const;
  }
}

/** Retry a failed or skipped email (admin → Notifications). */
export async function retryEmail(id: string) {
  const admin = createAdminClient();
  const { data } = await admin.from('email_outbox').select('*').eq('id', id).single();
  if (!data || data.status === 'sent') return 'skipped' as const;
  return deliver(data.id, data.to_email, data.subject, data.body_text);
}

/** Notify the owner/staff: dashboard notification + email to the owner address. */
export async function notifyStaff(input: {
  perm: Permission;
  title: string;
  body: string;
  link: string;
  dedupeKey: string;
  email?: boolean;
}) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('notifications').insert({
      audience: 'staff',
      staff_perm: input.perm,
      title: input.title,
      body: input.body,
      link: input.link,
      dedupe_key: 'staff:' + input.dedupeKey,
    });
    if (error?.code === '23505') return; // already notified
    if (input.email !== false) {
      const { data: s } = await admin.from('settings').select('owner_notification_email').eq('id', 1).single();
      if (s?.owner_notification_email) {
        await sendEmail({
          to: s.owner_notification_email,
          subject: `[Guitarz4U] ${input.title}`,
          text: `${input.body}\n\nOpen in the dashboard: ${SITE_URL}${input.link}`,
          dedupeKey: 'staff-email:' + input.dedupeKey,
        });
      }
    }
  } catch (e) {
    console.error('notifyStaff failed', e);
  }
}

/**
 * Notify a customer. If they have an account, an in-app notification is
 * created and the email respects their notification preference. Guests
 * (no account) receive transactional emails about their own request.
 */
export async function notifyCustomer(input: {
  userId?: string | null;
  email?: string | null;
  title: string;
  body: string;
  link?: string;
  dedupeKey: string;
  relatedType?: string;
  relatedId?: string;
}) {
  try {
    const admin = createAdminClient();
    let sendMail = Boolean(input.email);
    if (input.userId) {
      const { error } = await admin.from('notifications').insert({
        audience: 'customer',
        user_id: input.userId,
        title: input.title,
        body: input.body,
        link: input.link ?? '/account',
        dedupe_key: 'cust:' + input.dedupeKey,
      });
      if (error?.code === '23505') return;
      const { data: p } = await admin.from('profiles').select('notify_email').eq('id', input.userId).maybeSingle();
      if (p && !p.notify_email) sendMail = false;
    }
    if (sendMail && input.email) {
      const link = input.userId && input.link ? `\n\nView it in your account: ${SITE_URL}${input.link}` : '';
      await sendEmail({
        to: input.email,
        subject: `Guitarz4U: ${input.title}`,
        text: `Hello,\n\n${input.body}${link}`,
        dedupeKey: 'cust-email:' + input.dedupeKey,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
      });
    }
  } catch (e) {
    console.error('notifyCustomer failed', e);
  }
}
