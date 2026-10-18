import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Empty } from "@/components/ui";
import { markAdminNotificationsRead } from "../actions";

const EMAIL_LABEL: Record<string, string> = { not_attempted: "", not_configured: "email not configured", sent: "emailed", failed: "email failed" };

export default async function AdminNotifications() {
  const rows = await query<{ id: string; title: string; body: string; link: string; read_at: Date | null; email_status: string; created_at: Date }>(
    "select id, title, body, link, read_at, email_status, created_at from notifications where audience='admin' order by created_at desc limit 200",
  );
  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Notification centre</h1>
        {rows.some((r) => !r.read_at) && <form action={markAdminNotificationsRead}><button className="btn btn-outline btn-sm">Mark all as read</button></form>}
      </div>
      {rows.length === 0 ? <Empty title="No notifications yet" /> : (
        <div className="card" style={{ padding: 0 }}>
          {rows.map((n) => (
            <div key={n.id} className={`notif${n.read_at ? "" : " unread"}`}>
              <div>
                <strong>{n.link ? <Link href={n.link}>{n.title}</Link> : n.title}</strong>
                <p className="small pre-line" style={{ margin: "4px 0 0" }}>{n.body}</p>
              </div>
              <div className="small muted" style={{ textAlign: "right", whiteSpace: "nowrap" }}>{formatDateTime(n.created_at)}<br />{EMAIL_LABEL[n.email_status]}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
