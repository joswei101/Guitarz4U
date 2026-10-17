import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PAGE_DEFS, getPage } from "@/lib/content";
import { ContentPage } from "@/components/content-page";

const POLICY_SLUGS = ["privacy", "terms", "returns", "condition", "repair-terms", "sell-terms", "collection"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = POLICY_SLUGS.includes(slug) ? await getPage(slug) : null;
  return p ? { title: p.title, description: p.metaDescription, alternates: { canonical: `/policies/${slug}` } } : { title: "Not found" };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!POLICY_SLUGS.includes(slug)) notFound();
  return (
    <ContentPage slug={slug} eyebrow="Policies">
      <nav aria-label="Policies" className="rounded-xl border border-ink-500 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-bone-dim">All policies</p>
        <ul className="space-y-1.5 text-sm">
          {PAGE_DEFS.filter((d) => POLICY_SLUGS.includes(d.slug)).map((d) => (
            <li key={d.slug}><Link href={`/policies/${d.slug}`} className={d.slug === slug ? "text-amp" : "text-bone-muted hover:text-amp"}>{d.title}</Link></li>
          ))}
        </ul>
      </nav>
    </ContentPage>
  );
}
