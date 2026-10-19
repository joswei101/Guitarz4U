import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/content/PageHeader";
import { ShopView, toFilters } from "@/components/shop/ShopView";
import { getCategories } from "@/lib/data/products";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = (await getCategories()).find((c) => c.slug === category);
  if (!cat) return { title: "Category not found" };
  return {
    title: `Second-hand ${cat.name.toLowerCase()} in Johannesburg`,
    description: `${cat.description ?? cat.name} Honest condition ratings and disclosed defects. Collection in Sandringham, Johannesburg.`,
    alternates: { canonical: `/shop/category/${cat.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const cat = (await getCategories()).find((c) => c.slug === category);
  if (!cat) notFound();
  const filters = toFilters(await searchParams);
  return (
    <>
      <PageHeader eyebrow="Shop by category" title={`Second-hand ${cat.name.toLowerCase()}`}>
        <p>{cat.description}</p>
      </PageHeader>
      <ShopView filters={filters} basePath={`/shop/category/${cat.slug}`} lockedCategory={cat.slug} />
    </>
  );
}
