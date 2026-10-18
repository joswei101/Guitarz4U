import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/account/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { markNotificationsRead } from "@/app/actions/account";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { user } = await requireUser("/account/notifications");
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Notifications</h2>
        {unread > 0 && (
          <ActionButton action={markNotificationsRead.bind(null, undefined)} className="btn btn-outline btn-sm">
            Mark all as read
          </ActionButton>
        )}
      </div>
      {data?.length ? (
        <ul className="space-y-3">
          {data.map((n) => (
            <li key={n.id} className={`card p-4 ${n.read_at ? "" : "border-l-4 border-l-gold"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className={n.read_at ? "" : "font-semibold"}>{n.title}</p>
                <p className="text-xs text-tan">{formatDateTime(n.created_at)}</p>
              </div>
              {n.body && <p className="mt-1 whitespace-pre-line text-sm">{n.body}</p>}
              {n.link && (
                <Link href={n.link} className="link mt-2 inline-block text-sm">
                  View details
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No notifications yet">Updates about your requests, offers and repairs will appear here.</EmptyState>
      )}
    </div>
  );
}
