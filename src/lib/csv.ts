/** RFC 4180 CSV with protection against spreadsheet formula injection. */
export function toCsv(headers: string[], rows: (string | number | null | undefined | Date)[][]): string {
  const cell = (v: string | number | null | undefined | Date) => {
    if (v == null) return "";
    let s = v instanceof Date ? v.toISOString() : String(v);
    if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export const rand = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2));
