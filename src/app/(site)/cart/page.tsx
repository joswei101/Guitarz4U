import type { Metadata } from "next";
import { PageHeader } from "@/components/content/PageHeader";
import { CartView } from "@/components/shop/CartView";
import { getProfile, getUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Request cart",
  description: "Review the guitars you'd like to request and submit a purchase request. No online payment is taken.",
  robots: { index: false },
};

export default async function CartPage() {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  return (
    <>
      <PageHeader eyebrow="Request cart" title="Your request cart">
        <p>This is not a checkout. Submitting a purchase request does not take any payment.</p>
      </PageHeader>
      <div className="container-page py-10">
        <CartView
          signedIn={Boolean(user)}
          emailVerified={Boolean(user?.email_confirmed_at)}
          defaults={{
            name: profile?.full_name,
            email: profile?.email ?? user?.email,
            phone: profile?.phone,
            preferred: profile?.preferred_contact,
          }}
        />
      </div>
    </>
  );
}
