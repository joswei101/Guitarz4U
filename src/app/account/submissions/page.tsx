import Link from "next/link";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { formatDate, formatRand, SELLER_STATUSES } from "@/lib/format";
import { getHistory } from "@/lib/workflow";
import { StatusBadge, Empty, Timeline } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { respondToOffer, withdrawSubmission } from "../actions";

export default async function MySubmissions({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const rows = await query<{ id: string; reference: string; status: keyof typeof SELLER_STATUSES; brand: string; model: string; customer_update: string; created_at: Date }>(
    "select id, reference, status, brand, model, customer_update, created_at from seller_submissions where user_id=$1 order by created_at desc",
    [user.id],
  );
  const details = await Promise.all(
    rows.map(async (r) => ({
      offers: await query<{ id: string; amount_cents: number; message: string; status: string; created_at: Date }>(
        "select id, amount_cents, message, status, created_at from seller_offers where submission_id=$1 order by created_at desc",
        [r.id],
      ),
      images: await query<{ id: string }>("select id from seller_submission_images where submission_id=$1 order by created_at", [r.id]),
      history: await getHistory("seller_submission", r.id),
    })),
  );
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <div className="row between">
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Guitars I&apos;m selling</h1>
        <Link className="btn btn-primary btn-sm" href="/sell">Submit another guitar</Link>
      </div>
      {rows.length === 0 ? <Empty title="No guitar submissions"><Link className="btn btn-primary btn-sm" href="/sell">Sell a guitar</Link></Empty> : rows.map((r, i) => {
        const pending = details[i].offers.find((o) => o.status === "pending");
        return (
          <article key={r.id} className="card stack" data-testid="my-submission">
            <div className="row between">
              <h2 style={{ fontSize: "1.2rem", margin: 0 }}>{r.brand} {r.model}</h2>
              <StatusBadge status={r.status} label={SELLER_STATUSES[r.status]} />
            </div>
            <p className="small muted" style={{ margin: 0 }}>Reference {r.reference} · submitted {formatDate(r.created_at)}</p>
            {details[i].images.length > 0 && (
              <div className="thumb-row">
                {details[i].images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={img.id} src={`/api/private-image/seller/${img.id}`} alt="Your guitar photo" loading="lazy" />
                ))}
              </div>
            )}
            {r.customer_update && <div className="notice"><strong>Message from Guitarz4U</strong><p className="pre-line">{r.customer_update}</p></div>}
            {pending && (
              <div className="notice notice-info">
                <strong>Offer from Guitarz4U: {formatRand(pending.amount_cents)}</strong>
                {pending.message && <p className="pre-line">{pending.message}</p>}
                <p className="small">Accepting lets us arrange an inspection and payment with you. The sale is final only after inspection.</p>
                <div className="row">
                  <form action={respondToOffer}><input type="hidden" name="offerId" value={pending.id} /><input type="hidden" name="response" value="accept" /><button className="btn btn-primary btn-sm">Accept offer</button></form>
                  <form action={respondToOffer}><input type="hidden" name="offerId" value={pending.id} /><input type="hidden" name="response" value="decline" /><button className="btn btn-outline btn-sm">Decline offer</button></form>
                </div>
              </div>
            )}
            <details>
              <summary>Status history</summary>
              <div style={{ marginTop: 12 }}><Timeline events={details[i].history} labels={SELLER_STATUSES} /></div>
            </details>
            {!["purchased", "rejected", "withdrawn"].includes(r.status) && (
              <form action={withdrawSubmission}><input type="hidden" name="id" value={r.id} /><button className="link-btn small">Withdraw this submission</button></form>
            )}
          </article>
        );
      })}
    </div>
  );
}
