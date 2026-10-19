import type { Metadata } from "next";
import { PageHeader } from "@/components/content/PageHeader";
import { ShopView, toFilters } from "@/components/shop/ShopView";
import { PAYMENT_NOTICE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Shop second-hand guitars",
  description:
    "Browse pre-owned electric, bass, acoustic and classical guitars in Johannesburg. Honest condition ratings and disclosed defects on every listing.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = toFilters(await searchParams);
  return (
    <>
      <PageHeader eyebrow="The shop" title="Second-hand guitars">
        <p>Every guitar is described honestly, with condition ratings and any known defects disclosed.</p>
      </PageHeader>
      <div className="container-page pt-6">
        <p className="notice text-sm">{PAYMENT_NOTICE}</p>
      </div>
      <ShopView filters={filters} />
    </>
  );
}
