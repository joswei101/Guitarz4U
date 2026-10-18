import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RecordList } from "@/components/account/RecordList";
import { GUITAR_TYPES, REPAIR_STATUSES, statusLabel } from "@/lib/constants";

export const metadata = { title: "Repairs" };

export default async function RepairsListPage() {
  const { user } = await requireUser("/account/repairs");
  const supabase = await createClient();
  const { data } = await supabase
    .from("repair_bookings")
    .select("id, reference, status, guitar_type, brand, model, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <div>
      <h2 className="mb-4 text-2xl">Repair bookings</h2>
      <RecordList
        rows={(data ?? []).map((r) => ({
          id: r.id,
          href: `/account/repairs/${r.id}`,
          title: `${r.reference} · ${[r.brand, r.model].filter(Boolean).join(" ") || statusLabel(GUITAR_TYPES, r.guitar_type)}`,
          status: r.status,
          statusLabel: statusLabel(REPAIR_STATUSES, r.status),
          date: r.created_at,
        }))}
        empty={{ title: "No repair bookings", text: "Need a setup, new strings or a repair?", href: "/repairs#book", label: "Book a repair" }}
      />
    </div>
  );
}
