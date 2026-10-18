import type { Metadata } from "next";
import { getProfile, getUser } from "@/lib/auth";
import { CartView } from "@/components/cart/CartView";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = {
  title: "Request cart",
  description: "Review the items you'd like to request from Guitarz4U. No payment is taken online.",
  robots: { index: false },
};

export default async function CartPage() {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  return (
    <>
      <PageHeader eyebrow="Request cart" title="Your request cart">
        Collect the items you&apos;re interested in and send one enquiry. This is <strong>not a checkout</strong> — no
        payment is taken and nothing is final until Guitarz4U confirms with you.
      </PageHeader>
      <div className="container-page py-10">
        <CartView
          signedIn={Boolean(user)}
          defaults={{ name: profile?.full_name, phone: profile?.phone, email: user?.email, preferred: profile?.preferred_contact }}
        />
      </div>
    </>
  );
}
