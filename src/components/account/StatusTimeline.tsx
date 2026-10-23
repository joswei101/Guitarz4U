import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/Badge";

type Entity = "purchase_request" | "reservation" | "seller_submission" | "repair_booking";

export async function StatusTimeline({ entityType, entityId, labels }: { entityType: Entity; entityId: string; labels: Record<string, string> }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("status_updates")
    .select("id, status, message, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  const updates = (data ?? []) as { id: string; status: string; message: string | null; created_at: string }[];
  if (!updates.length) return <p className="text-sm text-ink-soft">No updates yet.</p>;
  return (
    <ol className="relative space-y-5 border-l-2 border-gold/40 pl-6">
      {updates.map((u) => (
        <li key={u.id} className="relative">
          <span className="absolute -left-[1.94rem] top-1 h-3.5 w-3.5 rounded-full border-2 border-cream-light bg-gold" aria-hidden="true" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={u.status} label={labels[u.status] ?? u.status} />
            <time className="text-xs text-ink-soft" dateTime={u.created_at}>
              {formatDateTime(u.created_at)}
            </time>
          </div>
          {u.message && <p className="mt-1 whitespace-pre-line text-sm text-ink">{u.message}</p>}
        </li>
      ))}
    </ol>
  );
}
