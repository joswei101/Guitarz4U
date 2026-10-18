import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RecordList } from "@/components/account/RecordList";
import { PURCHASE_REQUEST_STATUSES, statusLabel } from "@/lib/constants";
import { formatRand } from "@/lib/format";

export const metadata = { title: "Purchase requests" };

export default async function RequestsPage() {
  const { user } = await requireUser("/account/requests");
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchase_requests")
    .select("id, reference, status, total_estimate, created_at, items:purchase_request_items(title_snapshot)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <div>
      <h2 className="mb-4 text-2xl">Purchase requests</h2>
      <RecordList
        rows={(data ?? []).map((r) => ({
          id: r.id,
          href: `/account/requests/${r.id}`,
          title: `${r.reference} · ${formatRand(r.total_estimate)}`,
          subtitle: r.items.map((i) => i.title_snapshot).join(", "),
          status: r.status,
          statusLabel: statusLabel(PURCHASE_REQUEST_STATUSES, r.status),
          date: r.created_at,
        }))}
        empty={{ title: "No purchase requests yet", text: "Add items to your request cart and send us an enquiry.", href: "/shop", label: "Browse the shop" }}
      />
    </div>
  );
}
