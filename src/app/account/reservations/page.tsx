import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RecordList } from "@/components/account/RecordList";
import { RESERVATION_STATUSES, statusLabel } from "@/lib/constants";

export const metadata = { title: "Reservations" };

export default async function ReservationsPage() {
  const { user } = await requireUser("/account/reservations");
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select("id, reference, status, product_title_snapshot, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <div>
      <h2 className="mb-4 text-2xl">Reservations</h2>
      <RecordList
        rows={(data ?? []).map((r) => ({
          id: r.id,
          href: `/account/reservations/${r.id}`,
          title: `${r.reference} · ${r.product_title_snapshot}`,
          status: r.status,
          statusLabel: statusLabel(RESERVATION_STATUSES, r.status),
          date: r.created_at,
        }))}
        empty={{ title: "No reservations", text: "You can request a reservation on any available item in the shop.", href: "/shop", label: "Browse the shop" }}
      />
    </div>
  );
}
