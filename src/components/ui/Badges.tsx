import { conditionLabel, productStatusLabel, statusTone } from "@/lib/constants";

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={`badge badge-${statusTone(status)}`}>{label ?? status.replace(/_/g, " ")}</span>;
}

export function ConditionBadge({ condition }: { condition: string }) {
  return <span className="badge badge-neutral">Condition: {conditionLabel(condition)}</span>;
}

export function AvailabilityBadge({ status, quantity = 1 }: { status: string; quantity?: number }) {
  if (status === "published" && quantity > 0) return <span className="badge badge-success">Available</span>;
  if (status === "published") return <span className="badge badge-danger">Out of stock</span>;
  return <span className={`badge badge-${statusTone(status)}`}>{productStatusLabel(status)}</span>;
}

export function DemoBadge() {
  return (
    <span className="badge badge-info" title="Demonstration listing — not a real item for sale">
      Demo listing
    </span>
  );
}
