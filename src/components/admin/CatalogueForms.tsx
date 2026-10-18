"use client";
import { useFormAction } from "@/components/forms/useFormAction";

import { saveBrand, saveCategory } from "@/app/actions/admin";
import { SubmitButton } from "@/components/forms/SubmitButton";

type Cat = { id: number; name: string; description: string | null; kind: string; sort_order: number; active: boolean };

export function CategoryForm({ cat }: { cat?: Cat }) {
  const { state, onSubmit, pending: submitting } = useFormAction(saveCategory);
  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto_auto_auto_auto] sm:items-end">
      {cat && <input type="hidden" name="id" value={cat.id} />}
      <div>
        <label className="label text-xs">Name</label>
        <input name="name" defaultValue={cat?.name} className="input" required maxLength={60} />
      </div>
      <div>
        <label className="label text-xs">Description</label>
        <input name="description" defaultValue={cat?.description ?? ""} className="input" maxLength={500} />
      </div>
      <div>
        <label className="label text-xs">Kind</label>
        <select name="kind" defaultValue={cat?.kind ?? "guitar"} className="select">
          <option value="guitar">Guitar</option>
          <option value="equipment">Equipment</option>
        </select>
      </div>
      <div>
        <label className="label text-xs">Order</label>
        <input name="sort_order" type="number" defaultValue={cat?.sort_order ?? 10} className="input !w-20" />
      </div>
      <label className="flex items-center gap-2 pb-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={cat?.active ?? true} className="checkbox" /> Active
      </label>
      <SubmitButton pending={submitting} className="btn btn-outline" pendingText="…">{cat ? "Save" : "Add"}</SubmitButton>
      {state && <p className={`text-sm sm:col-span-6 ${state.ok ? "text-success" : "text-danger"}`}>{state.ok ? state.message : state.error}</p>}
    </form>
  );
}

export function BrandForm({ brand }: { brand?: { id: number; name: string } }) {
  const { state, onSubmit, pending: submitting } = useFormAction(saveBrand);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <label className="sr-only" htmlFor={`b-${brand?.id ?? "new"}`}>Brand name</label>
      <input id={`b-${brand?.id ?? "new"}`} name="name" defaultValue={brand?.name} className="input !w-56" required maxLength={60} placeholder="Brand name" />
      <SubmitButton pending={submitting} className="btn btn-outline btn-sm" pendingText="…">{brand ? "Rename" : "Add brand"}</SubmitButton>
      {state && <span className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>{state.ok ? state.message : state.error}</span>}
    </form>
  );
}
