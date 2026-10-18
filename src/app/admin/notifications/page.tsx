import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminTitle } from "@/components/admin/AdminUi";
import { ActionButton } from "@/components/account/ActionButton";
import { markAdminNotificationsRead } from "@/app/actions/admin";
import { formatDateTime } from "@/lib/format";
import { isEmailConfigured } from "@/lib/email";

export const metadata = { title: "Notifications" };

const EMAIL_LABEL: Record<string, string> = {
  not_applicable: "In-app only",
  pending: "Email not sent",
  sent: "Email sent",
  failed: "Email failed",
  not_configured: "No email address",
};

export default async function AdminNotifications({ searchParams }: PageProps<"/admin/notifications">) {
  const sp = await searchParams;
  const view = sp.view === "customers" ? "customers" : "admin";
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at, email_status, email_error, emailed_at, audience")
    .eq("audience", view === "admin" ? "admin" : "user")
    .order("created_at", { ascending: false })
    .limit(150);
  const emailOn = isEmailConfigured();
  return (
    <div>
      <AdminTitle
        title="Notifications"
        actions={view === "admin" && <ActionButton action={markAdminNotificationsRead.bind(null, undefined)} className="btn btn-outline btn-sm">Mark all read</ActionButton>}
      >
        {emailOn ? "Email notifications are switched on." : "Email is not configured — notifications are in-app only. Use WhatsApp buttons on each record to contact customers."}
      </AdminTitle>
      <nav className="mb-4 flex gap-2" aria-label="Notification type">
        <Link href="/admin/notifications" className={`btn btn-sm ${view === "admin" ? "btn-primary" : "btn-ghost"}`}>For you</Link>
        <Link href="/admin/notifications?view=customers" className={`btn btn-sm ${view === "customers" ? "btn-primary" : "btn-ghost"}`}>Sent to customers</Link>
      </nav>
      <ul className="space-y-2">
        {(data ?? []).map((n) => (
          <li key={n.id} className={`card p-4 ${view === "admin" && !n.read_at ? "border-l-4 border-l-gold" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              {n.link ? <Link href={n.link.startsWith("/account") ? n.link.replace("/account/requests/", "/admin/requests/").replace("/account/reservations/", "/admin/reservations/").replace("/account/submissions/", "/admin/submissions/").replace("/account/repairs/", "/admin/repairs/") : n.link} className="font-semibold hover:underline">{n.title}</Link> : <span className="font-semibold">{n.title}</span>}
              <span className="text-xs text-tan">{formatDateTime(n.created_at)}</span>
            </div>
            {n.body && <p className="mt-1 whitespace-pre-line text-sm">{n.body}</p>}
            <p className="mt-1 text-xs text-tan" title={n.email_error ?? undefined}>
              {EMAIL_LABEL[n.email_status] ?? n.email_status}
              {n.email_status === "sent" && n.emailed_at && ` · ${formatDateTime(n.emailed_at)}`}
              {n.email_status === "failed" && n.email_error && ` · ${n.email_error}`}
            </p>
          </li>
        ))}
        {!data?.length && <li className="card p-6 text-center text-tan">No notifications yet.</li>}
      </ul>
    </div>
  );
}
