import Link from "next/link";
import { StatusBadge } from "@/components/ui/Badges";
import { Pagination } from "@/components/ui/Pagination";
import { formatDateTime } from "@/lib/format";

export type WorkflowRow = { id: string; reference: string; who: string; what: string; status: string; statusLabel: string; created_at: string; extra?: string };

export function WorkflowTable({ rows, base, page, total, per, makeHref }: { rows: WorkflowRow[]; base: string; page: number; total: number; per: number; makeHref: (p: number) => string }) {
  if (!rows.length) return <div className="card p-8 text-center text-tan">Nothing here yet.</div>;
  return (
    <>
      <div className="card overflow-x-auto">
        <table className="table-g4u">
          <thead>
            <tr><th>Reference</th><th>Customer</th><th>Details</th><th>Status</th><th>Received</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap"><Link href={`${base}/${r.id}`} className="link font-semibold">{r.reference}</Link></td>
                <td>{r.who}</td>
                <td className="max-w-xs">{r.what}{r.extra && <span className="block text-xs text-tan">{r.extra}</span>}</td>
                <td><StatusBadge status={r.status} label={r.statusLabel} /></td>
                <td className="whitespace-nowrap text-xs">{formatDateTime(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.ceil(total / per)} makeHref={makeHref} />
    </>
  );
}
