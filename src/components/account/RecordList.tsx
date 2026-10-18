import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";

export type RecordRow = { id: string; href: string; title: string; subtitle?: string; status: string; statusLabel: string; date: string };

export function RecordList({ rows, empty }: { rows: RecordRow[]; empty: { title: string; text: string; href: string; label: string } }) {
  if (!rows.length)
    return (
      <EmptyState title={empty.title} action={{ href: empty.href, label: empty.label }}>
        {empty.text}
      </EmptyState>
    );
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={r.href} className="card flex items-center gap-4 p-4 transition-colors hover:border-gold">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{r.title}</p>
              {r.subtitle && <p className="truncate text-sm text-tan">{r.subtitle}</p>}
              <p className="text-xs text-tan">{formatDate(r.date)}</p>
            </div>
            <StatusBadge status={r.status} label={r.statusLabel} />
            <ChevronRight className="h-5 w-5 flex-none text-tan" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
