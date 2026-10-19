import Link from "next/link";
import { Fragment } from "react";

// A deliberately small, safe Markdown renderer for owner-editable content.
// Supports: #/##/### headings, paragraphs, - and 1. lists, **bold**, *italic*,
// [links](https://…), and > notes. It builds React elements (no raw HTML), so
// content cannot inject scripts.

function safeHref(href: string) {
  const h = href.trim();
  if (h.startsWith("/") || h.startsWith("#") || /^https?:\/\//i.test(h) || /^mailto:/i.test(h) || /^tel:/i.test(h)) return h;
  return null;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${i++}`;
    if (match[2]) nodes.push(<strong key={key}>{match[2]}</strong>);
    else if (match[3]) nodes.push(<em key={key}>{match[3]}</em>);
    else if (match[4]) {
      const href = safeHref(match[5]);
      if (!href) nodes.push(match[4]);
      else if (href.startsWith("/")) nodes.push(<Link key={key} href={href}>{match[4]}</Link>);
      else
        nodes.push(
          <a key={key} href={href} rel="noopener noreferrer" target={href.startsWith("http") ? "_blank" : undefined}>
            {match[4]}
          </a>,
        );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source, className = "prose-g4u" }: { source: string; className?: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      const k = `p${key++}`;
      blocks.push(<p key={k}>{renderInline(paragraph.join(" "), k)}</p>);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      const k = `l${key++}`;
      const items = list.items.map((item, idx) => <li key={idx}>{renderInline(item, `${k}-${idx}`)}</li>);
      blocks.push(list.ordered ? <ol key={k}>{items}</ol> : <ul key={k}>{items}</ul>);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const quote = /^>\s?(.*)$/.exec(line);

    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const k = `h${key++}`;
      const content = renderInline(heading[2], k);
      blocks.push(level === 1 ? <h2 key={k}>{content}</h2> : level === 2 ? <h2 key={k}>{content}</h2> : <h3 key={k}>{content}</h3>);
    } else if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
    } else if (quote) {
      flushParagraph();
      flushList();
      const k = `q${key++}`;
      blocks.push(
        <p key={k} className="notice">
          {renderInline(quote[1], k)}
        </p>,
      );
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();

  return (
    <div className={className}>
      {blocks.map((b, i) => (
        <Fragment key={i}>{b}</Fragment>
      ))}
    </div>
  );
}
