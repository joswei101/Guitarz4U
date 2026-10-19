"use client";

import { useActionState } from "react";
import { saveProductAction } from "@/app/admin/actions";
import { initialState } from "@/lib/actions";
import { CONDITION_LABELS, FUNCTIONAL_LABELS, PRODUCT_STATUS_LABELS } from "@/lib/constants";
import { CheckboxField, FormMessage, SelectField, SubmitButton, TextArea, TextField } from "@/components/forms/FormBits";

export type ProductFormValues = {
  id?: string;
  title?: string;
  brand_name?: string;
  model?: string | null;
  category_id?: number;
  price?: number;
  compare_at_price?: number | null;
  condition?: string;
  functional_status?: string;
  status?: string;
  description?: string;
  defects?: string;
  history?: string;
  specifications?: string;
  included_items?: string;
  year_made?: string | null;
  colour?: string | null;
  is_featured?: boolean;
  serial_number?: string | null;
  acquisition_notes?: string | null;
  internal_notes?: string | null;
};

export function ProductEditor({ values, categories, brands }: { values: ProductFormValues; categories: { id: number; name: string }[]; brands: string[] }) {
  const [state, action] = useActionState(saveProductAction, initialState);
  return (
    <form action={action} className="space-y-6">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-xl sm:col-span-2">Listing</h2>
        <TextField label="Title" name="title" required maxLength={140} defaultValue={values.title} state={state} className="sm:col-span-2" hint="e.g. Fender Player Stratocaster, 3-tone sunburst" />
        <TextField label="Brand" name="brand_name" maxLength={60} defaultValue={values.brand_name} list="brand-options" state={state} hint="Choose an existing brand or type a new one." />
        <datalist id="brand-options">
          {brands.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
        <TextField label="Model" name="model" maxLength={100} defaultValue={values.model ?? ""} state={state} />
        <SelectField label="Category" name="category_id" required defaultValue={values.category_id ? String(values.category_id) : ""} placeholder="Choose…" options={categories.map((c) => ({ value: String(c.id), label: c.name }))} state={state} />
        <SelectField
          label="Status"
          name="status"
          required
          defaultValue={values.status ?? "draft"}
          options={Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => ({ value, label: value === "published" ? "Available (published)" : label }))}
          state={state}
          hint="Only 'Available' and 'Reserved' listings are visible in the shop."
        />
        <TextField label="Price (R)" name="price" type="number" min={0} step="0.01" required defaultValue={values.price ?? ""} state={state} />
        <TextField label="Was price (R) — optional, for special offers" name="compare_at_price" type="number" min={0} step="0.01" defaultValue={values.compare_at_price ?? ""} state={state} hint="Shown struck through if higher than the price." />
        <SelectField label="Condition rating" name="condition" required defaultValue={values.condition ?? "good"} options={Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))} state={state} />
        <SelectField label="Working order" name="functional_status" required defaultValue={values.functional_status ?? "fully_working"} options={Object.entries(FUNCTIONAL_LABELS).map(([value, label]) => ({ value, label }))} state={state} />
        <TextField label="Colour" name="colour" maxLength={60} defaultValue={values.colour ?? ""} state={state} />
        <TextField label="Year (if known)" name="year_made" maxLength={20} defaultValue={values.year_made ?? ""} state={state} />
        <div className="sm:col-span-2">
          <CheckboxField name="is_featured" label="Feature this guitar on the home page" defaultChecked={values.is_featured} />
        </div>
      </section>

      <section className="card grid gap-4 p-5">
        <h2 className="text-xl">Description &amp; disclosure</h2>
        <TextArea label="Description" name="description" rows={6} maxLength={8000} defaultValue={values.description} state={state} />
        <TextArea label="Disclosed defects and damage" name="defects" rows={4} maxLength={4000} defaultValue={values.defects} state={state} hint="Be specific. This builds trust and protects you." />
        <TextArea label="Known history (optional)" name="history" rows={3} maxLength={4000} defaultValue={values.history} state={state} />
        <TextArea label="Specifications (optional)" name="specifications" rows={3} maxLength={4000} defaultValue={values.specifications} state={state} hint="Only include specifications you have verified." />
        <TextArea label="Included items (optional)" name="included_items" rows={2} maxLength={1000} defaultValue={values.included_items} state={state} hint="e.g. gig bag, tremolo arm, original case" />
      </section>

      <section className="card grid gap-4 border-gold p-5">
        <h2 className="text-xl">Private (administrators only)</h2>
        <p className="text-sm text-ink-soft">Never shown on the website. Stored in a separate, admin-only table.</p>
        <TextField label="Serial number" name="serial_number" maxLength={80} defaultValue={values.serial_number ?? ""} state={state} />
        <TextArea label="Acquisition notes" name="acquisition_notes" rows={2} maxLength={4000} defaultValue={values.acquisition_notes ?? ""} state={state} hint="Who you bought it from, what you paid, etc." />
        <TextArea label="Internal notes" name="internal_notes" rows={2} maxLength={4000} defaultValue={values.internal_notes ?? ""} state={state} />
      </section>

      <FormMessage state={state} />
      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-line bg-cream-light/95 p-4 backdrop-blur sm:mx-0 sm:rounded-lg">
        <SubmitButton pendingText="Saving…">{values.id ? "Save changes" : "Create product"}</SubmitButton>
      </div>
    </form>
  );
}
