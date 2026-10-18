"use client";
import { useFormAction } from "@/components/forms/useFormAction";

import { saveProduct } from "@/app/actions/admin";
import { Checkbox, Field, Select, TextArea } from "@/components/forms/Field";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Alert } from "@/components/ui/Alert";
import { CONDITIONS, PRODUCT_STATUSES } from "@/lib/constants";

export type ProductFormValues = {
  id?: string;
  title?: string;
  brand_id?: number | null;
  model?: string | null;
  category_id?: number;
  price?: number;
  compare_at_price?: number | null;
  condition?: string;
  description?: string;
  defects?: string;
  history?: string;
  year_made?: string | null;
  quantity?: number;
  status?: string;
  featured?: boolean;
  serial_number?: string | null;
  acquisition_cost?: number | null;
  acquired_from?: string | null;
  internal_notes?: string | null;
};

export function ProductForm({
  values,
  categories,
  brands,
}: {
  values: ProductFormValues;
  categories: { id: number; name: string }[];
  brands: { id: number; name: string }[];
}) {
  const { state, onSubmit, pending: submitting } = useFormAction(saveProduct);
  const e = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {state && <Alert tone={state.ok ? "success" : "error"}>{state.ok ? state.message : state.error}</Alert>}
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-xl md:col-span-2">Listing</h2>
        <Field className="md:col-span-2" label="Title" name="title" required maxLength={140} defaultValue={values.title} error={e.title} hint="e.g. Fender Player Stratocaster — Sunburst" />
        <Select label="Brand" name="brand_id" placeholder="— None —" options={brands.map((b) => ({ value: b.id, label: b.name }))} defaultValue={values.brand_id ?? ""} error={e.brand_id} hint="Add new brands under Categories & brands." />
        <Field label="Model" name="model" maxLength={120} defaultValue={values.model ?? ""} error={e.model} />
        <Select label="Category" name="category_id" required placeholder="Choose…" options={categories.map((c) => ({ value: c.id, label: c.name }))} defaultValue={values.category_id ?? ""} error={e.category_id} />
        <Select label="Condition" name="condition" required options={CONDITIONS} defaultValue={values.condition ?? "good"} error={e.condition} />
        <Field label="Price (R)" name="price" type="number" min={0} step="1" required defaultValue={values.price ?? ""} error={e.price} />
        <Field label="Was price (R) — for special offers" name="compare_at_price" type="number" min={0} step="1" defaultValue={values.compare_at_price ?? ""} error={e.compare_at_price} hint="Leave empty unless discounted. Must be higher than the price." />
        <Field label="Year (optional)" name="year_made" maxLength={20} defaultValue={values.year_made ?? ""} error={e.year_made} />
        <Field label="Quantity in stock" name="quantity" type="number" min={0} max={999} defaultValue={values.quantity ?? 1} error={e.quantity} hint="Usually 1 for second-hand guitars." />
        <TextArea className="md:col-span-2" label="Description" name="description" rows={6} maxLength={8000} defaultValue={values.description} error={e.description} />
        <TextArea className="md:col-span-2" label="Defects & damage (shown to customers)" name="defects" rows={4} maxLength={4000} defaultValue={values.defects} error={e.defects} />
        <TextArea className="md:col-span-2" label="Known history (optional)" name="history" rows={3} maxLength={4000} defaultValue={values.history} error={e.history} />
      </section>
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-xl md:col-span-2">Visibility</h2>
        <Select label="Status" name="status" options={PRODUCT_STATUSES} defaultValue={values.status ?? "draft"} hint="Draft and archived items are hidden from the public. Available = published." />
        <div className="flex items-end pb-2">
          <Checkbox name="featured" label="Feature on the home page" defaultChecked={values.featured} />
        </div>
      </section>
      <section className="card grid gap-4 border-walnut/40 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="text-xl">Private details</h2>
          <p className="text-sm text-tan">Only visible to administrators — never shown on the website.</p>
        </div>
        <Field label="Serial number" name="serial_number" maxLength={120} defaultValue={values.serial_number ?? ""} />
        <Field label="Acquisition cost (R)" name="acquisition_cost" type="number" min={0} defaultValue={values.acquisition_cost ?? ""} />
        <Field className="md:col-span-2" label="Acquired from" name="acquired_from" maxLength={500} defaultValue={values.acquired_from ?? ""} />
        <TextArea className="md:col-span-2" label="Internal notes" name="internal_notes" rows={3} maxLength={4000} defaultValue={values.internal_notes ?? ""} />
      </section>
      <SubmitButton pending={submitting} pendingText="Saving…" className="btn btn-primary">{values.id ? "Save changes" : "Create product"}</SubmitButton>
    </form>
  );
}
