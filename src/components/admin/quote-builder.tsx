"use client";

import { useState } from "react";
import { createQuoteAction } from "@/app/actions/admin/repairs";
import { ActionForm } from "../forms/action-form";
import { Field, Input, Textarea } from "../ui/form";
import { Button } from "../ui/button";

type Line = { type: "LABOUR" | "PART"; description: string; quantity: number; unitPrice: string; cost: string };

export function QuoteBuilder({ repairId, defaultWarranty }: { repairId: string; defaultWarranty: string }) {
  const [lines, setLines] = useState<Line[]>([{ type: "LABOUR", description: "", quantity: 1, unitPrice: "", cost: "" }]);
  const set = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.unitPrice.replace(",", ".")) || 0) * l.quantity, 0);
  return (
    <ActionForm action={createQuoteAction} submitLabel="Save draft quote">
      <input type="hidden" name="id" value={repairId} />
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid gap-2 rounded-md border border-ink-500 p-2 sm:grid-cols-[110px_1fr_70px_110px_110px_auto] sm:items-end">
            <label className="text-xs">Type<select value={l.type} onChange={(e) => set(i, { type: e.target.value as Line["type"] })} className="mt-1 w-full rounded border border-ink-400 bg-ink-800 px-2 py-2 text-sm"><option value="LABOUR">Labour</option><option value="PART">Part</option></select></label>
            <label className="text-xs">Description<Input value={l.description} onChange={(e) => set(i, { description: e.target.value })} required className="mt-1" /></label>
            <label className="text-xs">Qty<Input type="number" min={1} value={l.quantity} onChange={(e) => set(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="mt-1" /></label>
            <label className="text-xs">Unit price (R)<Input inputMode="decimal" value={l.unitPrice} onChange={(e) => set(i, { unitPrice: e.target.value })} required className="mt-1" /></label>
            <label className="text-xs">Your cost (R, private)<Input inputMode="decimal" value={l.cost} onChange={(e) => set(i, { cost: e.target.value })} className="mt-1" /></label>
            <Button type="button" variant="ghost" size="sm" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} disabled={lines.length === 1} aria-label="Remove line">✕</Button>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button type="button" variant="subtle" size="sm" onClick={() => setLines((ls) => [...ls, { type: "LABOUR", description: "", quantity: 1, unitPrice: "", cost: "" }])}>+ Labour</Button>
            <Button type="button" variant="subtle" size="sm" onClick={() => setLines((ls) => [...ls, { type: "PART", description: "", quantity: 1, unitPrice: "", cost: "" }])}>+ Part (customer pays)</Button>
          </div>
          <p className="text-sm">Quote total: <strong className="text-amp">R {total.toFixed(2)}</strong></p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Warranty (days)" htmlFor="warrantyDays" hint="Set per job"><Input id="warrantyDays" name="warrantyDays" type="number" min={0} /></Field>
        <Field label="Quote valid for (days)" htmlFor="validDays"><Input id="validDays" name="validDays" type="number" min={1} defaultValue={14} /></Field>
      </div>
      <Field label="Warranty terms" htmlFor="warrantyTerms"><Textarea id="warrantyTerms" name="warrantyTerms" defaultValue={defaultWarranty} className="min-h-20" /></Field>
      <Field label="Exclusions & customer responsibilities" htmlFor="exclusions"><Textarea id="exclusions" name="exclusions" defaultValue="Customer pays for the replacement parts listed. Excludes unrelated faults found later, customer-supplied parts, accidental damage and normal wear." className="min-h-20" /></Field>
      <Field label="Notes to customer" htmlFor="notes"><Textarea id="notes" name="notes" className="min-h-16" /></Field>
    </ActionForm>
  );
}
