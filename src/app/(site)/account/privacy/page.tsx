import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { DeletionRequestForm } from "@/components/account/DeletionRequestForm";

export const metadata: Metadata = { title: "Privacy & data", robots: { index: false } };

export default async function PrivacyDataPage() {
  const user = await requireUser("/account/privacy");
  const supabase = await createClient();
  const { data } = await supabase
    .from("data_requests")
    .select("id, request_type, status, created_at, completed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const requests = (data ?? []) as { id: string; request_type: string; status: string; created_at: string; completed_at: string | null }[];
  const pendingDeletion = requests.some((r) => r.request_type === "deletion" && r.status === "pending");

  return (
    <div className="space-y-8">
      <h1 className="text-3xl">Privacy &amp; data</h1>
      <p className="text-sm text-ink-soft">
        Your rights under the Protection of Personal Information Act (POPIA) are explained in our{" "}
        <Link href="/privacy" className="text-gold-ink underline">
          privacy policy
        </Link>
        .
      </p>
      <section className="card p-6">
        <h2 className="text-xl">Download your data</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Download a copy of the personal information linked to your account (profile, requests, reservations, submissions,
          repairs, reviews, wishlist, alerts and notifications) as a JSON file.
        </p>
        <a href="/account/privacy/export" className="btn btn-primary mt-4" download>
          Download my data
        </a>
      </section>
      <section className="card p-6">
        <h2 className="text-xl">Delete your account</h2>
        <p className="mt-1 text-sm text-ink-soft">
          We&apos;ll remove or anonymise your personal information. Records we&apos;re required to keep for tax or legal reasons (for
          example completed sales) are kept without your personal details.
        </p>
        <div className="mt-4">{pendingDeletion ? <p className="badge badge-warning">Deletion request pending</p> : <DeletionRequestForm />}</div>
      </section>
      {requests.length > 0 && (
        <section className="card p-6">
          <h2 className="text-xl">Your privacy requests</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2">
                <span className="capitalize">{r.request_type}</span>
                <span className="text-ink-soft">
                  {r.status} · {formatDateTime(r.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
