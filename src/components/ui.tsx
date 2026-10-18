import Link from "next/link";
import { statusTone, CONDITIONS, type Condition } from "@/lib/format";

export const EFT_NOTICE =
  "Guitarz4U does not process online payments. If your purchase request is approved, payment will be arranged privately by EFT with the owner. Please wait for confirmation before making payment. Your order is not confirmed until Guitarz4U has approved it and confirmed the arrangements.";

export function EftNotice({ title = "No online payments" }: { title?: string }) {
  return (
    <div className="notice" role="note" data-testid="eft-notice">
      <strong>{title}</strong>
      <p>{EFT_NOTICE}</p>
    </div>
  );
}

export function SecondHandNotice() {
  return (
    <div className="notice notice-info" role="note">
      <strong>Second-hand instrument</strong>
      <p>Pre-owned guitars may show signs of wear from previous use. All known defects are disclosed in the listing — please read them carefully and ask us anything before requesting a purchase.</p>
    </div>
  );
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`tag tag-${statusTone(status)}`}>{label}</span>;
}

export function ConditionLabel({ condition }: { condition: string }) {
  const c = CONDITIONS[condition as Condition];
  return (
    <span className="condition" title={c?.help}>
      Condition: <strong>{c?.label ?? condition}</strong>
    </span>
  );
}

export function PageHead({
  title,
  intro,
  eyebrow,
  crumbs,
}: {
  title: string;
  intro?: React.ReactNode;
  eyebrow?: string;
  crumbs?: { href?: string; label: string }[];
}) {
  return (
    <section className="page-head">
      <div className="wrap">
        {crumbs && (
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <ol>
              <li><Link href="/">Home</Link></li>
              {crumbs.map((c, i) => (
                <li key={i}>{c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}</li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
    </section>
  );
}

export function Timeline({ events, labels }: { events: { status: string; public_note: string; created_at: Date }[]; labels: Record<string, string> }) {
  if (events.length === 0) return <p className="muted">No updates yet.</p>;
  return (
    <ol className="timeline">
      {events.map((e, i) => (
        <li key={i}>
          <time dateTime={new Date(e.created_at).toISOString()}>
            {new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" }).format(new Date(e.created_at))}
          </time>
          <strong>{labels[e.status] ?? e.status}</strong>
          {e.public_note && <p className="pre-line" style={{ margin: "4px 0 0" }}>{e.public_note}</p>}
        </li>
      ))}
    </ol>
  );
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span style={{ opacity: 0.3 }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
