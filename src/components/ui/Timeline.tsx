import { formatDateTime } from "@/lib/format";

export type TimelineEvent = { id: number | string; to_status: string; note: string | null; created_at: string };

export function Timeline({ events, label }: { events: TimelineEvent[]; label: (status: string) => string }) {
  if (!events.length) return null;
  return (
    <ol className="relative ml-2 border-l-2 border-gold/40 pl-6">
      {events.map((e, i) => (
        <li key={e.id} className="relative pb-6 last:pb-0">
          <span
            className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full border-2 border-gold ${i === events.length - 1 ? "bg-gold" : "bg-ivory"}`}
            aria-hidden
          />
          <p className="font-semibold">{label(e.to_status)}</p>
          <p className="text-xs text-tan">{formatDateTime(e.created_at)}</p>
          {e.note && <p className="mt-1 whitespace-pre-line text-sm">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
