import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { NoteForm } from "@/components/admin/AdminForms";
import { addAdminNoteAction } from "@/app/admin/actions";

export async function AdminNotes({ entityType, entityId, path }: { entityType: string; entityId: string; path: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_notes")
    .select("id, note, created_at, author:profiles(full_name, email)")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  const notes = (data ?? []) as unknown as { id: string; note: string; created_at: string; author: { full_name: string | null; email: string | null } | null }[];
  return (
    <section className="card border-gold p-5">
      <h2 className="text-lg">Private notes</h2>
      <p className="text-xs text-ink-soft">Visible to administrators only — never shown to customers.</p>
      {notes.length > 0 && (
        <ul className="mt-3 space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg bg-cream/60 p-3 text-sm">
              <p className="whitespace-pre-line">{n.note}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {n.author?.full_name || n.author?.email || "Admin"} · {formatDateTime(n.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <NoteForm action={addAdminNoteAction} entityType={entityType} entityId={entityId} path={path} />
      </div>
    </section>
  );
}
