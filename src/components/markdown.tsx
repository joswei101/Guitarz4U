import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Minimal, safe Markdown renderer for owner-editable pages. It produces React elements only
 * (no raw HTML), so edited content cannot inject scripts. Supports headings (##, ###),
 * paragraphs, bullet and numbered lists, > callouts, **bold** and [links](/path).
 * Text in [OWNER TO CONFIRM …] or [LEGAL REVIEW …] brackets is highlighted for review.
 */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\((?:\/[^)\s]*|https:\/\/[^)\s]+)\))|(\[(?:OWNER TO CONFIRM|LEGAL REVIEW)[^\]]*\])|(https:\/\/[^\s)]+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[1]) out.push(<strong key={k}>{m[1].slice(2, -2)}</strong>);
    else if (m[2]) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(m[2])!;
      out.push(href.startsWith("/") ? <Link key={k} href={href}>{label}</Link> : <a key={k} href={href} target="_blank" rel="noopener noreferrer">{label}</a>);
    } else if (m[3]) out.push(<mark key={k} className="rounded bg-yellow-400/20 px-1 text-warn">{m[3]}</mark>);
    else if (m[4]) out.push(<a key={k} href={m[4]} target="_blank" rel="noopener noreferrer">{m[4]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, bi) => {
        const b = block.trim();
        const key = `b${bi}`;
        if (!b) return null;
        if (b.startsWith("### ")) return <h3 key={key}>{inline(b.slice(4), key)}</h3>;
        if (b.startsWith("## ")) return <h2 key={key}>{inline(b.slice(3), key)}</h2>;
        if (b.startsWith("> ")) {
          return (
            <aside key={key} className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-warn">
              {inline(b.replace(/^> ?/gm, ""), key)}
            </aside>
          );
        }
        const lines = b.split("\n");
        if (lines.every((l) => /^- /.test(l))) return <ul key={key} className="space-y-1.5">{lines.map((l, li) => <li key={li}>{inline(l.slice(2), `${key}-${li}`)}</li>)}</ul>;
        if (lines.every((l) => /^\d+\. /.test(l))) {
          return (
            <ol key={key} className="space-y-2">
              {lines.map((l, li) => (
                <li key={li} className="!list-none !ml-0 flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amp text-xs font-bold text-ink">{li + 1}</span>
                  <span>{inline(l.replace(/^\d+\. /, ""), `${key}-${li}`)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return <p key={key}>{inline(lines.join(" "), key)}</p>;
      })}
    </>
  );
}
