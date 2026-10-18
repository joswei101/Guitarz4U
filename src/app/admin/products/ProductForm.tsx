import { CONDITIONS, PRODUCT_STATUSES } from "@/lib/format";
import { CompressingFileInput } from "@/components/CompressingFileInput";

export type ProductFormValues = {
  id?: string; title: string; brand: string; model: string; categoryId: number | ""; price: string; compareAt: string;
  condition: string; description: string; defects: string; history: string; serialNumber: string; status: string; featured: boolean;
};

export function ProductForm({
  values, categories, brands, action, submitLabel,
}: {
  values: ProductFormValues;
  categories: { id: number; name: string }[];
  brands: string[];
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
}) {
  return (
    <form action={action} className="card form">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="form-grid">
        <div className="field field-full"><label htmlFor="title">Listing title <span className="req">*</span></label>
          <input id="title" name="title" type="text" required minLength={3} maxLength={140} defaultValue={values.title} placeholder="e.g. Fender Player Stratocaster — Polar White" /></div>
        <div className="field"><label htmlFor="brand">Brand</label>
          <input id="brand" name="brand" type="text" list="brand-list" maxLength={80} defaultValue={values.brand} />
          <datalist id="brand-list">{brands.map((b) => <option key={b} value={b} />)}</datalist></div>
        <div className="field"><label htmlFor="model">Model</label><input id="model" name="model" type="text" maxLength={120} defaultValue={values.model} /></div>
        <div className="field"><label htmlFor="categoryId">Category <span className="req">*</span></label>
          <select id="categoryId" name="categoryId" required defaultValue={values.categoryId}>
            <option value="" disabled>Choose…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div className="field"><label htmlFor="condition">Condition <span className="req">*</span></label>
          <select id="condition" name="condition" required defaultValue={values.condition}>
            {Object.entries(CONDITIONS).map(([k, v]) => <option key={k} value={k}>{v.label} — {v.help}</option>)}
          </select></div>
        <div className="field"><label htmlFor="price">Price (R) <span className="req">*</span></label>
          <input id="price" name="price" type="text" inputMode="decimal" required defaultValue={values.price} placeholder="e.g. 8500" /></div>
        <div className="field"><label htmlFor="compareAt">“Was” price for a special offer (R)</label>
          <input id="compareAt" name="compareAt" type="text" inputMode="decimal" defaultValue={values.compareAt} aria-describedby="compareAt-hint" />
          <span className="hint" id="compareAt-hint">Optional. Must be higher than the price. Shows the item as a special offer.</span></div>
        <div className="field"><label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={values.status}>
            {Object.entries(PRODUCT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div className="field"><label htmlFor="serialNumber">Serial number (private)</label>
          <input id="serialNumber" name="serialNumber" type="text" maxLength={80} defaultValue={values.serialNumber} aria-describedby="serial-hint" />
          <span className="hint" id="serial-hint">Never shown publicly — admin only.</span></div>
        <div className="field field-full"><label htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={6} maxLength={8000} defaultValue={values.description} /></div>
        <div className="field field-full"><label htmlFor="defects">Disclosed defects &amp; damage</label>
          <textarea id="defects" name="defects" rows={4} maxLength={4000} defaultValue={values.defects} placeholder="List every known scratch, ding, fault or missing part." /></div>
        <div className="field field-full"><label htmlFor="history">Known history (optional)</label>
          <textarea id="history" name="history" rows={3} maxLength={4000} defaultValue={values.history} /></div>
        <div className="field field-full"><label htmlFor="images">Add photos</label>
          <CompressingFileInput id="images" name="images" /></div>
      </div>
      <label className="check"><input type="checkbox" name="featured" defaultChecked={values.featured} /> Feature this guitar on the home page</label>
      <button className="btn btn-primary">{submitLabel}</button>
    </form>
  );
}
