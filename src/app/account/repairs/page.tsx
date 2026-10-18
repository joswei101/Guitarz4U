import Link from "next/link";
import { requireUser } from "@/lib/session";
import { query } from "@/lib/db";
import { formatDate, formatRand, REPAIR_STATUSES, REPAIR_SERVICES } from "@/lib/format";
import { getHistory } from "@/lib/workflow";
import { StatusBadge, Empty, Timeline } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { respondToQuote, cancelRepair } from "../actions";

export default async function MyRepairs({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const rows = await query<{ id: string; reference: string; status: keyof typeof REPAIR_STATUSES; guitar_brand: string; guitar_model: string; services: (keyof typeof REPAIR_SERVICES)[]; preferred_date: Date | null; confirmed_date: Date | null; quote_amount_cents: number | null; quote_message: string; quote_provided_at: Date | null; quote_response: string | null; customer_update: string; created_at: Date }>(
    "select id, reference, status, guitar_brand, guitar_model, services, preferred_date, confirmed_date, quote_amount_cents, quote_message, quote_provided_at, quote_response, customer_update, created_at from repair_bookings where user_id=$1 order by created_at desc",
    [user.id],
  );
  const histories = await Promise.all(rows.map((r) => getHistory("repair_booking", r.id)));
  return (
    <div className="stack">
      <Flash msg={sp.msg} />
      <div className="row between">
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Repairs</h1>
        <Link className="btn btn-primary btn-sm" href="/repairs#book">Book a repair</Link>
      </div>
      {rows.length === 0 ? <Empty title="No repair bookings"><Link className="btn btn-primary btn-sm" href="/repairs#book">Book a repair</Link></Empty> : rows.map((r, i) => (
        <article key={r.id} className="card stack" data-testid="my-repair">
          <div className="row between">
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>{r.guitar_brand} {r.guitar_model}</h2>
            <StatusBadge status={r.status} label={REPAIR_STATUSES[r.status]} />
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Reference {r.reference} · booked {formatDate(r.created_at)} · {r.services.map((s) => REPAIR_SERVICES[s]).join(", ") || "General"}
            {r.preferred_date && ` · preferred date ${formatDate(r.preferred_date)} (request)`}
          </p>
          {r.confirmed_date && <p style={{ margin: 0 }}><strong>Confirmed date:</strong> {formatDate(r.confirmed_date)}</p>}
          {r.customer_update && <div className="notice"><strong>Message from Guitarz4U</strong><p className="pre-line">{r.customer_update}</p></div>}
          {r.quote_provided_at && (
            <div className="notice notice-info">
              <strong>Quote: {r.quote_amount_cents !== null ? formatRand(r.quote_amount_cents) : "see message"}</strong>
              {r.quote_message && <p className="pre-line">{r.quote_message}</p>}
              {r.quote_response ? (
                <p>You {r.quote_response} this quote.</p>
              ) : r.status === "quote_provided" ? (
                <div className="row">
                  <form action={respondToQuote}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="response" value="accept" /><button className="btn btn-primary btn-sm">Accept quote</button></form>
                  <form action={respondToQuote}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="response" value="decline" /><button className="btn btn-outline btn-sm">Decline quote</button></form>
                </div>
              ) : null}
            </div>
          )}
          <details>
            <summary>Status history</summary>
            <div style={{ marginTop: 12 }}><Timeline events={histories[i]} labels={REPAIR_STATUSES} /></div>
          </details>
          {["submitted", "awaiting_review", "awaiting_info", "quote_provided"].includes(r.status) && (
            <form action={cancelRepair}><input type="hidden" name="id" value={r.id} /><button className="link-btn small">Cancel this booking</button></form>
          )}
        </article>
      ))}
    </div>
  );
}
