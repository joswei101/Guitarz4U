import { formatDateTime } from '@/lib/format';
import { label } from '@/lib/labels';

type Entry = { id: number; from_status: string | null; to_status: string; note: string; created_at: string };

export function Timeline({ entries, labels }: { entries: Entry[]; labels: Record<string, string> }) {
  if (!entries.length) return <p className="muted">No updates yet.</p>;
  return (
    <ol className="timeline">
      {entries.map((e) => (
        <li key={e.id}>
          <div className="when">{formatDateTime(e.created_at)}</div>
          <strong>{e.from_status === e.to_status ? 'Update' : label(labels, e.to_status)}</strong>
          {e.note ? <div style={{ whiteSpace: 'pre-line' }}>{e.note}</div> : null}
        </li>
      ))}
    </ol>
  );
}
