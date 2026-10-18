import type { Category, Product } from "@prisma/client";
import { CONDITION_LABELS } from "@/lib/catalog";
import { Field, Input, Select, Textarea, Checkbox } from "../ui/form";

function rand(cents: number | null | undefined) {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

/** Shared fields for creating/editing a product. Pricing fields are only rendered for the owner (and only accepted server-side from the owner). */
export function ProductFields({ product, categories, canPrice }: { product?: Product; categories: Category[]; canPrice: boolean }) {
  const specs = product ? Object.entries((product.specifications ?? {}) as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("\n") : "";
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Title" htmlFor="title" required className="md:col-span-2"><Input id="title" name="title" required defaultValue={product?.title} placeholder="e.g. Fender Player Stratocaster — Polar White" /></Field>
      <Field label="Brand" htmlFor="brand" required><Input id="brand" name="brand" required defaultValue={product?.brand} /></Field>
      <Field label="Model" htmlFor="model" required><Input id="model" name="model" required defaultValue={product?.model} /></Field>
      <Field label="Category" htmlFor="categoryId" required>
        <Select id="categoryId" name="categoryId" required defaultValue={product?.categoryId ?? ""}>
          <option value="" disabled>Choose…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isPartsCategory ? " (stock quantity)" : ""}</option>)}
        </Select>
      </Field>
      <Field label="Condition rating" htmlFor="condition" required>
        <Select id="condition" name="condition" required defaultValue={product?.condition ?? "GOOD"}>
          {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <Field label="Description" htmlFor="description" className="md:col-span-2"><Textarea id="description" name="description" defaultValue={product?.description} className="min-h-40" /></Field>
      <Field label="Condition notes (known faults, wear, repairs)" htmlFor="conditionNotes" className="md:col-span-2" hint="Shown publicly. Be specific and honest — required before publishing."><Textarea id="conditionNotes" name="conditionNotes" defaultValue={product?.conditionNotes} /></Field>
      <Field label="Specifications" htmlFor="specifications" className="md:col-span-2" hint='One per line as "Name: value", e.g. "Body: Alder".'><Textarea id="specifications" name="specifications" defaultValue={specs} className="font-mono text-sm" /></Field>
      <Checkbox id="isLeftHanded" name="isLeftHanded" defaultChecked={product?.isLeftHanded} label="Left-handed instrument" />
      {canPrice && (
        <>
          <Checkbox id="isFeatured" name="isFeatured" defaultChecked={product?.isFeatured} label="Feature on the homepage" />
          <div className="rounded-lg border border-amp/30 p-4 md:col-span-2">
            <p className="mb-3 text-sm font-semibold text-amp">Pricing & private financials (owner only — never shown publicly)</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Price (R)" htmlFor="price" required><Input id="price" name="price" inputMode="decimal" required defaultValue={rand(product?.priceCents)} /></Field>
              <Field label="Sale price (R, optional)" htmlFor="salePrice"><Input id="salePrice" name="salePrice" inputMode="decimal" defaultValue={rand(product?.salePriceCents)} /></Field>
              <Field label="Acquisition cost (R)" htmlFor="acquisitionCost"><Input id="acquisitionCost" name="acquisitionCost" inputMode="decimal" defaultValue={rand(product?.acquisitionCostCents)} /></Field>
              <Field label="Repair/refurb cost (R)" htmlFor="refurbishmentCost"><Input id="refurbishmentCost" name="refurbishmentCost" inputMode="decimal" defaultValue={rand(product?.refurbishmentCostCents)} /></Field>
              <Field label="Stock quantity (parts only)" htmlFor="quantity" hint="Guitars are always unique (1)."><Input id="quantity" name="quantity" type="number" min={0} defaultValue={product?.quantity ?? 1} /></Field>
              <Field label="Low-stock alert at (parts)" htmlFor="lowStockThreshold"><Input id="lowStockThreshold" name="lowStockThreshold" type="number" min={0} defaultValue={product?.lowStockThreshold ?? ""} /></Field>
              <Field label="Private notes" htmlFor="privateNotes" className="sm:col-span-2"><Textarea id="privateNotes" name="privateNotes" defaultValue={product?.privateNotes ?? ""} className="min-h-16" /></Field>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
