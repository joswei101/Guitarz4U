import { createClient } from "@/lib/supabase/server";
import { AdminTitle, FilterBar, cleanSearch } from "@/components/admin/AdminUi";
import { WorkflowTable } from "@/components/admin/WorkflowList";
import { RESERVATION_STATUSES, statusLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Reservations" };
const PER = 30;

export default async function AdminReservations({ searchParams }: PageProps<"/admin/reservations">) {
  const sp = await searchParams;
  const q = cleanSearch(sp.q);
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase
    .from("reservations")
    .select("id, reference, contact_name, product_title_snapshot, status, expires_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER, page * PER - 1);
  if (status === "open") query = query.in("status", ["requested", "approved"]);
  else if (status) query = query.eq("status", status);
  if (q) query = query.or(`reference.ilike.%${q}%,contact_name.ilike.%${q}%,product_title_snapshot.ilike.%${q}%,contact_phone.ilike.%${q}%`);
  const { data, count } = await query;
  return (
    <div>
      <AdminTitle title="Reservations">Requests are never confirmed until you approve them. Approving marks the item as reserved until the hold expires.</AdminTitle>
      <FilterBar action="/admin/reservations" q={q} status={status} statuses={RESERVATION_STATUSES} />
      <WorkflowTable
        base="/admin/reservations"
        page={page}
        per={PER}
        total={count ?? 0}
        makeHref={(p) => `/admin/reservations?${new URLSearchParams({ q, status, page: String(p) })}`}
        rows={(data ?? []).map((r) => ({
          id: r.id,
          reference: r.reference,
          who: r.contact_name,
          what: r.product_title_snapshot,
          extra: r.status === "approved" && r.expires_at ? `Held until ${formatDateTime(r.expires_at)}` : undefined,
          status: r.status,
          statusLabel: statusLabel(RESERVATION_STATUSES, r.status),
          created_at: r.created_at,
        }))}
      />
    </div>
  );
}
