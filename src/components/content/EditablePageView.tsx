import { Markdown } from "@/components/content/Markdown";
import { PageHeader } from "@/components/content/PageHeader";
import { getEditablePage } from "@/lib/pages";

export async function EditablePageView({ slug, eyebrow, aside }: { slug: string; eyebrow?: string; aside?: React.ReactNode }) {
  const page = await getEditablePage(slug);
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={page.title}>
        <p>{page.description}</p>
      </PageHeader>
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_20rem]">
        <Markdown source={page.body} />
        {aside && <aside className="space-y-4">{aside}</aside>}
      </div>
    </>
  );
}
