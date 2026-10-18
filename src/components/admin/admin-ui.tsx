import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "../ui/cn";

export function AdminHeader({ title, children, back }: { title: string; children?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && <Link href={back.href} className="mb-1 inline-block text-xs text-bone-dim hover:text-amp">← {back.label}</Link>}
        <h1 className="font-display text-3xl uppercase tracking-wide">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, href, tone }: { label: string; value: ReactNode; hint?: string; href?: string; tone?: "amp" | "warn" }) {
  const body = (
    <div className={cn("h-full rounded-xl border bg-ink-800 p-4", tone === "amp" ? "border-amp/50" : tone === "warn" ? "border-yellow-500/50" : "border-ink-500", href && "hover:border-amp")}>
      <p className="text-xs uppercase tracking-widest text-bone-dim">{label}</p>
      <p className="mt-2 font-display text-3xl text-bone">{value}</p>
      {hint && <p className="mt-1 text-xs text-bone-dim">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Table({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-ink-500 bg-ink-800/50"><table className="table-base">{children}</table></div>;
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-ink-500 bg-ink-800 p-3">{children}</form>;
}

export function Pager({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const sep = base.includes("?") ? "&" : "?";
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center gap-3 text-sm">
      {page > 1 && <Link className="link" href={`${base}${sep}page=${page - 1}`}>← Prev</Link>}
      <span className="text-bone-dim">Page {page} / {pages}</span>
      {page < pages && <Link className="link" href={`${base}${sep}page=${page + 1}`}>Next →</Link>}
    </nav>
  );
}

export function qsWith(sp: Record<string, string | undefined>, omit: string[] = ["page"]): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && !omit.includes(k)) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}
