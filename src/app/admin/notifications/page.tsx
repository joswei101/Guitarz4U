import { requireAdmin } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin/AdminUI";
import { NotificationList } from "@/components/account/NotificationList";
import { isEmailConfigured } from "@/lib/email";

export const metadata = { title: "Notifications" };

export default async function AdminNotifications() {
  const { user } = await requireAdmin();
  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Notification centre"
        description={
          isEmailConfigured()
            ? `New requests, submissions, bookings, reviews and enquiries appear here and are also emailed to ${process.env.ADMIN_NOTIFICATION_EMAIL || "(no ADMIN_NOTIFICATION_EMAIL set)"}.`
            : "New requests, submissions, bookings, reviews and enquiries appear here. Email notifications are not configured."
        }
      />
      <NotificationList userId={user.id} />
    </div>
  );
}
