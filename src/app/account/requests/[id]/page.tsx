import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStatusEvents } from "@/lib/data/account";
import { Alert } from "@/components/ui/Alert";
import { StatusBadge } from "@/components/ui/Badges";
import { Timeline } from "@/components/ui/Timeline";
import { ActionButton } from "@/components/account/ActionButton";
import { cancelPurchaseRequest } from "@/app/actions/account";
import { PURCHASE_REQUEST_STATUSES, statusLabel } from "@/lib/constants";
import { formatDateTime, formatRand } from "@/lib/format";

export const metadata = { title: "Purchase request" };

export default async function RequestDetail({ params, searchParams }: PageProps<"/account/requests/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  await requireUser(`/account/requests/${id}`);
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("purchase_requests")
    .select("*, items:purchase_request_items(id, title_snapshot, price_snapshot, quantity, product:products(slug))")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();
  const events = await getStatusEvents("purchase_request", id);
  const label = (s: string) => statusLabel(PURCHASE_REQUEST_STATUSES, s);
  const cancellable = ["submitted", "reviewing", "accepted", "awaiting_payment"].includes(r.status);

  return (
    <div className="space-y-6">
      {sp.submitted && (
        <Alert tone="success" title="Your request has been submitted">
          Guitarz4U will review your enquiry and contact you to confirm availability and payment arrangements. Your
          request is not a completed purchase, and no payment has been taken.
        </Alert>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/account/requests" className="link text-sm">← All requests</Link>
          <h2 className="mt-1 text-2xl">Purchase request {r.reference}</h2>
          <p className="text-sm text-tan">Sent {formatDateTime(r.created_at)}</p>
        </div>
        <StatusBadge status={r.status} label={label(r.status)} />
      </div>
      {r.customer_message && (
        <Alert tone="info" title="Message from Guitarz4U">
          <p className="whitespace-pre-line">{r.customer_message}</p>
        </Alert>
      )}
      <section className="card p-5">
        <h3 className="text-lg">Items</h3>
        <ul className="mt-3 divide-y divide-gold/20">
          {r.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-2">
              <span>
                {i.product?.slug ? <Link href={`/shop/${i.product.slug}`} className="link">{i.title_snapshot}</Link> : i.title_snapshot}
                {i.quantity > 1 && ` × ${i.quantity}`}
              </span>
              <span className="font-semibold">{formatRand(Number(i.price_snapshot) * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-gold/40 pt-3 font-semibold">
          <span>Estimated total</span>
          <span>{formatRand(r.total_estimate)}</span>
        </p>
        {r.message && <p className="mt-4 whitespace-pre-line text-sm"><strong>Your message:</strong> {r.message}</p>}
      </section>
      <section className="card p-5">
        <h3 className="mb-4 text-lg">Progress</h3>
        <Timeline events={events} label={label} />
      </section>
      <p className="text-sm text-tan">
        Payment is arranged directly with Guitarz4U (normally EFT). We will never ask for card details on this website.
      </p>
      {cancellable && (
        <ActionButton action={cancelPurchaseRequest.bind(null, r.id)} confirm="Cancel this request?" className="btn btn-outline text-danger">
          Cancel request
        </ActionButton>
      )}
    </div>
  );
}
