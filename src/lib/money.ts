const formatter = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 });

/** Formats integer cents as South African rand, e.g. 1250050 -> "R 12 500,50". */
export function formatZAR(cents: number): string {
  return formatter.format(cents / 100);
}

/** Parses a rand amount typed by staff ("12500", "12 500.50", "R12,500.50") into integer cents. */
export function randToCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100);
  const cleaned = input.replace(/[R\s]/gi, "").replace(/,(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) throw new Error("Invalid amount");
  return Math.round(value * 100);
}

/** Two-decimal string for payment gateways, e.g. 1250050 -> "12500.50". */
export function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function effectivePrice(p: { priceCents: number; salePriceCents: number | null }): number {
  return p.salePriceCents && p.salePriceCents < p.priceCents ? p.salePriceCents : p.priceCents;
}
