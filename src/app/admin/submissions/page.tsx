import { createClient } from "@/lib/supabase/server";
import { AdminTitle, FilterBar, cleanSearch } from "@/components/admin/AdminUi";
import { WorkflowTable } from "@/components/admin/WorkflowList";
import { SELLER_STATUSES, conditionLabel, statusLabel } from "@/lib/constants";
import { formatRand } from "@/lib/format";

export const metadata = { title: "Seller submissions" };
const PER = 30;

export default async function AdminSubmissions({ searchParams }: PageProps<"/admin/submissions">) {
  const sp = await searchParams;
  const q = cleanSearch(sp.q);
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let query = supabase
    .from("seller_submissions")
    .select("id, reference, contact_name, brand, model, condition, is_working, asking_price, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER, page * PER - 1);
  if (status === "open") query = query.in("status", ["submitted", "under_review", "more_info_requested", "approved", "offer_accepted"]);
  else if (status) query = query.eq("status", status);
  if (q) query = query.or(`reference.ilike.%${q}%,contact_name.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,contact_phone.ilike.%${q}%`);
  const { data, count } = await query;
  return (
    <div>
      <AdminTitle title="Seller submissions">Guitars people want to sell to you. Nothing is promised until you make an offer.</AdminTitle>
      <FilterBar action="/admin/submissions" q={q} status={status} statuses={SELLER_STATUSES} />
      <WorkflowTable
        base="/admin/submissions"
        page={page}
        per={PER}
        total={count ?? 0}
        makeHref={(p) => `/admin/submissions?${new URLSearchParams({ q, status, page: String(p) })}`}
        rows={(data ?? []).map((r) => ({
          id: r.id,
          reference: r.reference,
          who: r.contact_name,
          what: `${r.brand} ${r.model}`,
          extra: `${conditionLabel(r.condition)} · ${r.is_working ? "working" : "broken"}${r.asking_price ? ` · asking ${formatRand(r.asking_price)}` : ""}`,
          status: r.status,
          statusLabel: statusLabel(SELLER_STATUSES, r.status),
          created_at: r.created_at,
        }))}
      />
    </div>
  );
}
