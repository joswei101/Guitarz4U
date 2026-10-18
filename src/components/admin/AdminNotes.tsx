import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { NoteForm } from "./NoteForm";

/** Private notes — admin only (RLS), never shown to customers. */
export async function AdminNotes({ entityType, entityId }: { entityType: string; entityId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_notes")
    .select("id, note, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return (
    <section className="card p-5">
      <h2 className="text-lg">Private notes</h2>
      <p className="text-xs text-tan">Only visible to admins.</p>
      <NoteForm entityType={entityType} entityId={entityId} />
      <ul className="mt-3 space-y-2">
        {(data ?? []).map((n) => (
          <li key={n.id} className="rounded bg-cream-2 p-2 text-sm">
            <p className="whitespace-pre-line">{n.note}</p>
            <p className="text-xs text-tan">{formatDateTime(n.created_at)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
