import Link from "next/link";
import { query } from "@/lib/db";
import { formatDateTime, CONTACT_METHODS } from "@/lib/format";
import { whatsappLink } from "@/lib/settings";
import { Empty, StatusBadge } from "@/components/ui";
import { updateMessage } from "../actions";

export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const sp = await searchParams;
  const all = sp.all === "1";
  const rows = await query<{ id: string; kind: string; name: string; email: string; phone: string; preferred_contact: keyof typeof CONTACT_METHODS; subject: string; message: string; status: string; admin_notes: string; created_at: Date; product_title: string | null; product_id: string | null }>(
    `select m.*, p.title product_title from contact_messages m left join products p on p.id=m.product_id
     where $1 or m.status in ('new','read') order by m.created_at desc limit 200`,
    [all],
  );
  return (
    <div className="stack">
      <div className="row between">
        <h1 style={{ fontSize: "2rem", margin: 0 }}>Messages &amp; product questions</h1>
        <a className="btn btn-ghost btn-sm" href={all ? "/admin/messages" : "/admin/messages?all=1"}>{all ? "Open only" : "Show all"}</a>
      </div>
      {rows.length === 0 ? <Empty title="No open messages" /> : rows.map((m) => (
        <article key={m.id} id={m.id} className="card stack">
          <div className="row between">
            <strong>{m.subject || (m.kind === "product_question" ? "Product question" : "Message")}</strong>
            <StatusBadge status={m.status === "new" ? "pending" : m.status === "replied" ? "completed" : "neutral"} label={m.status} />
          </div>
          {m.product_title && <p className="small" style={{ margin: 0 }}>About: <Link href={`/admin/products/${m.product_id}`}>{m.product_title}</Link></p>}
          <p className="pre-line" style={{ margin: 0 }}>{m.message}</p>
          <p className="small muted" style={{ margin: 0 }}>{m.name} · {m.email || "no email"} · {m.phone || "no phone"} · prefers {CONTACT_METHODS[m.preferred_contact]} · {formatDateTime(m.created_at)}</p>
          <div className="row">
            {m.email && <a className="btn btn-ghost btn-sm" href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + (m.subject || "Your message to Guitarz4U"))}`}>Reply by email</a>}
            {m.phone && <a className="btn btn-whatsapp btn-sm" href={whatsappLink(m.phone, `Hi ${m.name.split(" ")[0]}, this is Guitarz4U replying to your message. `)} target="_blank" rel="noopener noreferrer">Reply on WhatsApp</a>}
          </div>
          <form action={updateMessage} className="row">
            <input type="hidden" name="id" value={m.id} />
            <label className="sr-only" htmlFor={`n-${m.id}`}>Private note</label>
            <input id={`n-${m.id}`} name="adminNotes" className="input" defaultValue={m.admin_notes} placeholder="Private note" style={{ maxWidth: 300 }} />
            <button className="btn btn-outline btn-sm" name="status" value="read">Mark read</button>
            <button className="btn btn-primary btn-sm" name="status" value="replied">Mark replied</button>
            <button className="btn btn-ghost btn-sm" name="status" value="archived">Archive</button>
          </form>
        </article>
      ))}
    </div>
  );
}
