import { statusTone } from "@/lib/constants";

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`badge badge-${statusTone(status)}`}>{label}</span>;
}
