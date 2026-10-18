import { createClient } from "@/lib/supabase/server";
import { AdminTitle, FilterBar, cleanSearch } from "@/components/admin/AdminUi";
import { WorkflowTable } from "@/components/admin/WorkflowList";
import { PURCHASE_REQUEST_STATUSES, statusLabel } from "@/lib/constants";
import { formatRand } from "@/lib/format";

export const metadata = { title: "Purchase requests" };
const PER = 30;

export default async function AdminRequests({ searchParams }: PageProps<"/admin/requests">) {
  const sp = await searchParams;
  const q = cleanSearch(sp.q);
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase
    .from("purchase_requests")
    .select("id, reference, contact_name, contact_phone, status, total_estimate, created_at, items:purchase_request_items(title_snapshot)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER, page * PER - 1);
  if (status === "open") query = query.in("status", ["submitted", "reviewing", "accepted", "awaiting_payment"]);
  else if (status) query = query.eq("status", status);
  if (q) query = query.or(`reference.ilike.%${q}%,contact_name.ilike.%${q}%,contact_email.ilike.%${q}%,contact_phone.ilike.%${q}%`);
  const { data, count } = await query;
  return (
    <div>
      <AdminTitle title="Purchase requests">Enquiries from the request cart. No payment has been taken for any of these.</AdminTitle>
      <FilterBar action="/admin/requests" q={q} status={status} statuses={PURCHASE_REQUEST_STATUSES} />
      <WorkflowTable
        base="/admin/requests"
        page={page}
        per={PER}
        total={count ?? 0}
        makeHref={(p) => `/admin/requests?${new URLSearchParams({ q, status, page: String(p) })}`}
        rows={(data ?? []).map((r) => ({
          id: r.id,
          reference: r.reference,
          who: r.contact_name,
          what: r.items.map((i) => i.title_snapshot).join(", "),
          extra: formatRand(r.total_estimate),
          status: r.status,
          statusLabel: statusLabel(PURCHASE_REQUEST_STATUSES, r.status),
          created_at: r.created_at,
        }))}
      />
    </div>
  );
}
