import Link from "next/link";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { Empty } from "@/components/ui";
import { markNotificationsRead } from "../actions";

export default async function MyNotifications() {
  const user = await requireUser();
  const rows = await query<{ id: string; title: string; body: string; link: string; read_at: Date | null; created_at: Date }>(
    "select id, title, body, link, read_at, created_at from notifications where user_id=$1 and audience='user' order by created_at desc limit 100",
    [user.id],
  );
  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Notifications</h1>
        {rows.some((r) => !r.read_at) && <form action={markNotificationsRead}><button className="btn btn-outline btn-sm">Mark all as read</button></form>}
      </div>
      {rows.length === 0 ? <Empty title="No notifications yet" /> : (
        <div className="card" style={{ padding: 0 }}>
          {rows.map((n) => (
            <div key={n.id} className={`notif${n.read_at ? "" : " unread"}`}>
              <div>
                <strong>{n.link ? <Link href={n.link}>{n.title}</Link> : n.title}</strong>
                <p className="small pre-line" style={{ margin: "4px 0 0" }}>{n.body}</p>
              </div>
              <time className="small muted" style={{ whiteSpace: "nowrap" }}>{formatDateTime(n.created_at)}</time>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
