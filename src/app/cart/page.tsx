import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { PageHead, EftNotice } from "@/components/ui";
import { CartClient } from "./CartClient";

export const metadata: Metadata = { title: "Request cart", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const user = await getCurrentUser();
  const profile = user
    ? await queryOne<{ phone: string | null; preferred_contact: string }>("select phone, preferred_contact from customer_profiles where user_id=$1", [user.id])
    : null;
  return (
    <>
      <PageHead
        title="Your request cart"
        eyebrow="Purchase request — not a checkout"
        intro="Review the guitars you are interested in and send us a purchase request. Nothing is charged and nothing is confirmed until we contact you."
        crumbs={[{ label: "Request cart" }]}
      />
      <div className="wrap section-tight">
        <div style={{ marginBottom: 20 }}><EftNotice /></div>
        <CartClient
          defaults={user ? { name: user.name, email: user.email, phone: profile?.phone ?? "", preferredContact: profile?.preferred_contact ?? "whatsapp" } : undefined}
          loggedIn={Boolean(user)}
        />
      </div>
    </>
  );
}
