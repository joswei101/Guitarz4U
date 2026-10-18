const TZ = "Africa/Johannesburg";

/** Format an amount in South African rand, e.g. "R 12 500". */
export function formatRand(value: number | string | null | undefined, opts: { cents?: boolean } = {}) {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  const showCents = opts.cents ?? !Number.isInteger(n);
  // Deterministic South African style (space as thousands separator, "." for cents)
  // so server and browser render identically.
  const [whole, cents] = Math.abs(n).toFixed(showCents ? 2 : 0).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const formatted = `${n < 0 ? "-" : ""}${grouped}${cents ? "." + cents : ""}`;
  return `R ${formatted}`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(
    new Date(value),
  );
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(value));
}

export function timeAgo(value: string | Date) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function truncate(text: string, length: number) {
  if (text.length <= length) return text;
  return text.slice(0, length - 1).trimEnd() + "…";
}
