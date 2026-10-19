import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { markAllNotificationsReadAction } from "@/app/(site)/account/actions";
import { EmptyState } from "@/components/ui/EmptyState";

export async function NotificationList({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as { id: string; title: string; body: string; link: string | null; read_at: string | null; created_at: string }[];
  const unread = rows.filter((r) => !r.read_at).length;

  if (!rows.length) return <EmptyState title="No notifications yet" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">{unread} unread</p>
        {unread > 0 && (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="btn btn-outline btn-sm">
              Mark all as read
            </button>
          </form>
        )}
      </div>
      <ul className="card divide-y divide-line">
        {rows.map((n) => (
          <li key={n.id} className={`flex gap-3 p-4 ${n.read_at ? "" : "bg-cream/50"}`}>
            {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Unread" />}
            <div className="min-w-0">
              <p className={`text-sm ${n.read_at ? "" : "font-semibold"}`}>
                {n.link ? (
                  <Link href={n.link} className="text-walnut hover:text-gold-ink">
                    {n.title}
                  </Link>
                ) : (
                  n.title
                )}
              </p>
              {n.body && <p className="text-sm text-ink-soft">{n.body}</p>}
              <p className="text-xs text-ink-soft">{formatDateTime(n.created_at)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
