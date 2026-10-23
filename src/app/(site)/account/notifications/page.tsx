import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { NotificationList } from "@/components/account/NotificationList";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const user = await requireUser("/account/notifications");
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Notifications</h1>
      <NotificationList userId={user.id} />
    </div>
  );
}
