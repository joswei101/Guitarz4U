import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders admin-editable Markdown safely (raw HTML is not allowed). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-g4u">
      <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
