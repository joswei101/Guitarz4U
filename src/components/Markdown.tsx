import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders owner-editable Markdown. Raw HTML is NOT rendered (react-markdown
 * ignores it by default), which prevents script injection through content.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children: c }) => {
            const safe = href && /^(https?:|mailto:|\/|#)/.test(href) ? href : undefined;
            const external = safe?.startsWith('http');
            return (
              <a href={safe} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{c}</a>
            );
          },
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
