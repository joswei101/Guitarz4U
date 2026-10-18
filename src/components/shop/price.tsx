import { formatZAR } from "@/lib/money";
import { cn } from "../ui/cn";

export function Price({ priceCents, salePriceCents, size = "md", className }: { priceCents: number; salePriceCents: number | null; size?: "md" | "lg"; className?: string }) {
  const onSale = salePriceCents != null && salePriceCents < priceCents;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-display font-semibold tracking-wide", onSale ? "text-amp" : "text-bone", size === "lg" ? "text-3xl" : "text-lg")}>
        {formatZAR(onSale ? salePriceCents! : priceCents)}
      </span>
      {onSale && (
        <span className={cn("text-bone-dim line-through", size === "lg" ? "text-lg" : "text-sm")}>
          <span className="sr-only">Was </span>
          {formatZAR(priceCents)}
        </span>
      )}
    </span>
  );
}
