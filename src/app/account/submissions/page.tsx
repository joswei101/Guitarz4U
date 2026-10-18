import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RecordList } from "@/components/account/RecordList";
import { SELLER_STATUSES, statusLabel } from "@/lib/constants";

export const metadata = { title: "Guitars I'm selling" };

export default async function SubmissionsPage() {
  const { user } = await requireUser("/account/submissions");
  const supabase = await createClient();
  const { data } = await supabase
    .from("seller_submissions")
    .select("id, reference, status, brand, model, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <div>
      <h2 className="mb-4 text-2xl">Guitars I&apos;m selling</h2>
      <RecordList
        rows={(data ?? []).map((r) => ({
          id: r.id,
          href: `/account/submissions/${r.id}`,
          title: `${r.reference} · ${r.brand} ${r.model}`,
          status: r.status,
          statusLabel: statusLabel(SELLER_STATUSES, r.status),
          date: r.created_at,
        }))}
        empty={{ title: "No submissions yet", text: "Thinking of selling a guitar? Tell us about it.", href: "/sell", label: "Sell your guitar" }}
      />
    </div>
  );
}
