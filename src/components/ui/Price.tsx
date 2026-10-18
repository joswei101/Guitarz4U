import { formatRand } from "@/lib/format";

export function Price({
  price,
  compareAt,
  size = "md",
}: {
  price: number;
  compareAt?: number | null;
  size?: "sm" | "md" | "lg";
}) {
  const cls = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className={`font-display font-semibold text-walnut ${cls}`}>{formatRand(price)}</span>
      {compareAt ? (
        <>
          <span className="text-sm text-tan line-through" aria-label={`Was ${formatRand(compareAt)}`}>
            {formatRand(compareAt)}
          </span>
          <span className="badge badge-warning">Special offer</span>
        </>
      ) : null}
    </span>
  );
}
