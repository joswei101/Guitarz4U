import Link from "next/link";

export function AdminTitle({ title, children, actions }: { title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {children && <div className="mt-1 text-sm text-tan">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** GET filter bar: search box + status select. */
export function FilterBar({
  action,
  q,
  status,
  statuses,
  extra,
}: {
  action: string;
  q?: string;
  status?: string;
  statuses?: readonly { value: string; label: string }[];
  extra?: React.ReactNode;
}) {
  return (
    <form action={action} className="card mb-4 flex flex-wrap items-end gap-3 p-3">
      <div className="min-w-48 flex-1">
        <label htmlFor="fb-q" className="label">Search</label>
        <input id="fb-q" name="q" defaultValue={q} className="input" placeholder="Reference, name, email, phone…" />
      </div>
      {statuses && (
        <div>
          <label htmlFor="fb-s" className="label">Status</label>
          <select id="fb-s" name="status" defaultValue={status} className="select">
            <option value="">All</option>
            <option value="open">Open / needs action</option>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}
      {extra}
      <button className="btn btn-primary">Filter</button>
      <Link href={action} className="btn btn-ghost">Reset</Link>
    </form>
  );
}

export function Stat({ label, value, href, tone }: { label: string; value: React.ReactNode; href?: string; tone?: "gold" }) {
  const inner = (
    <>
      <span className="text-sm text-tan">{label}</span>
      <span className={`mt-1 font-display text-3xl ${tone === "gold" ? "text-gold" : ""}`}>{value}</span>
    </>
  );
  return href ? (
    <Link href={href} className="card flex flex-col p-4 hover:border-gold">{inner}</Link>
  ) : (
    <div className="card flex flex-col p-4">{inner}</div>
  );
}

/** Sanitise free text for PostgREST .or() filters. */
export function cleanSearch(q: unknown) {
  return typeof q === "string" ? q.replace(/[^\p{L}\p{N} @.+-]/gu, "").trim().slice(0, 60) : "";
}
