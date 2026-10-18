import { notFound } from "next/navigation";
import { getPage } from "@/lib/content";
import { Markdown } from "./markdown";
import { PageHeader, Prose } from "./ui/misc";
import { fmtDate } from "./status-badges";

export async function ContentPage({ slug, eyebrow, children }: { slug: string; eyebrow?: string; children?: React.ReactNode }) {
  const page = await getPage(slug);
  if (!page) notFound();
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={page.title} />
      <div className="container grid gap-10 py-10 lg:grid-cols-[minmax(0,720px)_1fr]">
        <article>
          <Prose><Markdown source={page.body} /></Prose>
          {page.updatedAt && <p className="mt-10 text-xs text-bone-dim">Last updated {fmtDate(page.updatedAt)}</p>}
        </article>
        {children && <aside>{children}</aside>}
      </div>
    </>
  );
}
