// CSV helpers. Values that start with = + - @ are prefixed with an apostrophe
// so spreadsheet programs don't execute them as formulas (CSV injection).

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const lines = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))];
  // BOM so Excel opens UTF-8 correctly.
  return "﻿" + lines.join("\r\n");
}
