import { createClient } from "@/lib/supabase/server";
import { AdminTitle, FilterBar, cleanSearch } from "@/components/admin/AdminUi";
import { WorkflowTable } from "@/components/admin/WorkflowList";
import { GUITAR_TYPES, REPAIR_STATUSES, repairServiceLabel, statusLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Repairs" };
const PER = 30;

export default async function AdminRepairs({ searchParams }: PageProps<"/admin/repairs">) {
  const sp = await searchParams;
  const q = cleanSearch(sp.q);
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase
    .from("repair_bookings")
    .select("id, reference, contact_name, guitar_type, brand, model, requested_services, preferred_date, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER, page * PER - 1);
  if (status === "open") query = query.in("status", ["submitted", "awaiting_review", "awaiting_customer", "quote_provided", "approved", "in_progress", "awaiting_collection"]);
  else if (status) query = query.eq("status", status);
  if (q) query = query.or(`reference.ilike.%${q}%,contact_name.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,contact_phone.ilike.%${q}%`);
  const { data, count } = await query;
  return (
    <div>
      <AdminTitle title="Repair bookings">Nothing is confirmed or started until you approve it.</AdminTitle>
      <FilterBar action="/admin/repairs" q={q} status={status} statuses={REPAIR_STATUSES} />
      <WorkflowTable
        base="/admin/repairs"
        page={page}
        per={PER}
        total={count ?? 0}
        makeHref={(p) => `/admin/repairs?${new URLSearchParams({ q, status, page: String(p) })}`}
        rows={(data ?? []).map((r) => ({
          id: r.id,
          reference: r.reference,
          who: r.contact_name,
          what: `${statusLabel(GUITAR_TYPES, r.guitar_type)} ${[r.brand, r.model].filter(Boolean).join(" ")}`,
          extra: r.requested_services.map(repairServiceLabel).join(", ") + (r.preferred_date ? ` · prefers ${formatDate(r.preferred_date)}` : ""),
          status: r.status,
          statusLabel: statusLabel(REPAIR_STATUSES, r.status),
          created_at: r.created_at,
        }))}
      />
    </div>
  );
}
