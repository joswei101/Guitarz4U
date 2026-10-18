import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { query, queryOne } from "@/lib/db";
import { SideNav } from "@/components/SideNav";

export const metadata: Metadata = { title: "My account", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Links requests made before registering (same, verified email) to the account. */
async function claimGuestRecords(userId: string, email: string) {
  await Promise.all([
    query("update purchase_requests set user_id=$1 where user_id is null and lower(contact_email)=lower($2)", [userId, email]),
    query("update reservations set user_id=$1 where user_id is null and lower(contact_email)=lower($2)", [userId, email]),
    query("update seller_submissions set user_id=$1 where user_id is null and email<>'' and lower(email)=lower($2)", [userId, email]),
    query("update repair_bookings set user_id=$1 where user_id is null and email<>'' and lower(email)=lower($2)", [userId, email]),
  ]);
}

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  if (user.emailVerified) await claimGuestRecords(user.id, user.email);
  const unread = await queryOne<{ n: number }>("select count(*)::int as n from notifications where user_id=$1 and audience='user' and read_at is null", [user.id]);
  return (
    <div className="wrap dash">
      <SideNav
        title={`Hi, ${user.name.split(" ")[0]}`}
        links={[
          { href: "/account", label: "Overview" },
          { href: "/account/requests", label: "Purchase requests" },
          { href: "/account/reservations", label: "Reservations" },
          { href: "/account/submissions", label: "Guitars I'm selling" },
          { href: "/account/repairs", label: "Repairs" },
          { href: "/account/wishlist", label: "Wishlist" },
          { href: "/account/notifications", label: "Notifications", count: unread?.n },
          { href: "/account/profile", label: "Profile & password" },
          { href: "/account/privacy", label: "Privacy & data" },
          ...(user.role === "admin" ? [{ href: "/admin", label: "→ Admin dashboard" }] : []),
        ]}
        signOut
      />
      <div>{children}</div>
    </div>
  );
}
