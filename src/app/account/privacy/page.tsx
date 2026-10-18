import Link from "next/link";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeletionForm } from "@/components/forms/DeletionForm";
import { StatusBadge } from "@/components/ui/Badges";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Privacy & data" };

export default async function PrivacyPage() {
  const { user } = await requireUser("/account/privacy");
  const supabase = await createClient();
  const { data: requests } = await supabase.from("data_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h2 className="text-2xl">Download your data</h2>
        <p className="mt-2 text-sm">
          Get a copy of the personal information linked to your account — profile, requests, reservations, seller
          submissions, offers, repairs, reviews, wishlist and notifications — as a JSON file.
        </p>
        <a href="/account/export" className="btn btn-primary mt-4" download>
          <Download className="h-4 w-4" aria-hidden /> Download my data
        </a>
      </section>
      <section className="card p-6">
        <h2 className="text-2xl">Delete your account</h2>
        <p className="mt-2 text-sm">
          We&apos;ll delete your login, wishlist and notifications and remove your name and contact details from our
          records. Records of completed purchases, offers and repairs are kept without your contact details for
          accounting and legal purposes. See our{" "}
          <Link href="/policies/privacy" className="link">privacy policy</Link>.
        </p>
        <div className="mt-4">
          <DeletionForm />
        </div>
      </section>
      {requests && requests.length > 0 && (
        <section className="card p-6">
          <h2 className="text-xl">Your privacy requests</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {r.request_type === "deletion" ? "Account deletion" : "Data export"} — {formatDate(r.created_at)}
                  {r.admin_response && <span className="block text-tan">{r.admin_response}</span>}
                </span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
