"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setProductStatus, toggleFeatured } from "@/app/actions/admin";
import { PRODUCT_STATUSES } from "@/lib/constants";

export function ProductRowActions({ id, slug, status, featured }: { id: string; slug: string; status: string; featured: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setErr(r.ok ? null : (r.error ?? "Failed"));
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`st-${id}`}>Status</label>
      <select
        id={`st-${id}`}
        className="select !min-h-9 !w-auto !py-1 text-sm"
        value={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "sold" && !confirm("Mark as sold? Pending reservation requests for it will be declined.")) return;
          run(() => setProductStatus(id, next));
        }}
      >
        {PRODUCT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => toggleFeatured(id, !featured))}>
        {featured ? "Unfeature" : "Feature"}
      </button>
      <Link href={`/admin/products/${id}`} className="btn btn-outline btn-sm">Edit</Link>
      {["published", "reserved", "sold"].includes(status) && (
        <Link href={`/shop/${slug}`} className="btn btn-ghost btn-sm" target="_blank">View</Link>
      )}
      {err && <span className="text-xs text-danger">{err}</span>}
    </div>
  );
}
