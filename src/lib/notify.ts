import { query, queryOne } from "./db";
import { env } from "./env";
import { sendEmail } from "./email";

/**
 * Creates an in-app notification for the admin notification centre and, when
 * email is configured, emails ADMIN_NOTIFY_EMAIL. Failures never break the
 * customer's request — the in-app record is the source of truth.
 */
export async function notifyAdmin(kind: string, title: string, body: string, link: string) {
  try {
    const row = await queryOne<{ id: string }>(
      "insert into notifications (audience, kind, title, body, link) values ('admin',$1,$2,$3,$4) returning id",
      [kind, title, body, link],
    );
    if (env.adminNotifyEmail && row) {
      const result = await sendEmail({
        to: env.adminNotifyEmail,
        subject: `[Guitarz4U] ${title}`,
        text: body,
        actionUrl: env.siteUrl + link,
        actionLabel: "Open in admin dashboard",
      });
      await query("update notifications set email_status=$1 where id=$2", [result.status, row.id]);
    }
  } catch (err) {
    console.error("[notify] admin notification failed", err);
  }
}

/**
 * Notifies a customer. Always creates an in-app notification when the record
 * belongs to an account; emails them when email is configured and an address exists.
 */
export async function notifyCustomer(opts: {
  userId: string | null;
  email?: string | null;
  kind: string;
  title: string;
  body: string;
  link: string;
}) {
  try {
    let notificationId: string | null = null;
    if (opts.userId) {
      const row = await queryOne<{ id: string }>(
        "insert into notifications (audience, user_id, kind, title, body, link) values ('user',$1,$2,$3,$4,$5) returning id",
        [opts.userId, opts.kind, opts.title, opts.body, opts.link],
      );
      notificationId = row?.id ?? null;
    }
    if (opts.email) {
      const result = await sendEmail({
        to: opts.email,
        subject: `Guitarz4U: ${opts.title}`,
        text: opts.body,
        actionUrl: env.siteUrl + opts.link,
        actionLabel: "View update",
      });
      if (notificationId) await query("update notifications set email_status=$1 where id=$2", [result.status, notificationId]);
    }
  } catch (err) {
    console.error("[notify] customer notification failed", err);
  }
}
