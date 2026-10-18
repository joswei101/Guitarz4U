import { site } from "../site";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface EmailContent {
  subject: string;
  /** Paragraphs of plain text. Rendered escaped in HTML. */
  paragraphs: string[];
  action?: { label: string; url: string };
  /** Key/value rows shown as a summary table */
  details?: [string, string][];
  footerNote?: string;
}

export function renderEmail(c: EmailContent): { subject: string; html: string; text: string } {
  const rows = (c.details ?? [])
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#8a8a8a;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0;color:#111">${escapeHtml(v)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:#0a0a0a;padding:20px 28px;color:#fff;font-size:22px;font-weight:bold;letter-spacing:1px">GUITARZ<span style="color:#ff9f1c">4U</span>
<div style="font-size:11px;font-weight:normal;color:#b5b5b5;letter-spacing:2px;text-transform:uppercase;margin-top:4px">${escapeHtml(site.tagline)}</div></td></tr>
<tr><td style="padding:28px;color:#222;font-size:15px;line-height:1.6">
${c.paragraphs.map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("")}
${rows ? `<table role="presentation" style="margin:8px 0 18px;font-size:14px">${rows}</table>` : ""}
${c.action ? `<p style="margin:22px 0"><a href="${escapeHtml(c.action.url)}" style="background:#ff9f1c;color:#0a0a0a;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">${escapeHtml(c.action.label)}</a></p><p style="font-size:12px;color:#8a8a8a">If the button does not work, copy this link into your browser:<br>${escapeHtml(c.action.url)}</p>` : ""}
</td></tr>
<tr><td style="padding:18px 28px;background:#fafafa;color:#8a8a8a;font-size:12px;line-height:1.5">
${c.footerNote ? `${escapeHtml(c.footerNote)}<br><br>` : ""}${escapeHtml(site.name)} · ${escapeHtml(site.area)} · WhatsApp ${escapeHtml(site.whatsappDisplay)} · ${escapeHtml(site.email)}
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    ...c.paragraphs,
    ...(c.details ?? []).map(([k, v]) => `${k}: ${v}`),
    c.action ? `${c.action.label}: ${c.action.url}` : "",
    c.footerNote ?? "",
    `${site.name} · ${site.area} · WhatsApp ${site.whatsappDisplay} · ${site.email}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  return { subject: c.subject, html, text };
}
