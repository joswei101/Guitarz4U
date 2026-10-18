import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data/products";
import { requireUser } from "@/lib/auth";
import { ReservationForm } from "@/components/forms/ReservationForm";
import { Alert } from "@/components/ui/Alert";
import { Price } from "@/components/ui/Price";
import { ProductImage } from "@/components/shop/ProductImage";

export const metadata: Metadata = { title: "Request a reservation", robots: { index: false } };

export default async function ReservePage({ params }: PageProps<"/shop/[slug]/reserve">) {
  const { slug } = await params;
  const { user, profile } = await requireUser(`/shop/${slug}/reserve`);
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const available = product.status === "published" && product.quantity > 0;

  return (
    <div className="container-page max-w-3xl py-10">
      <Link href={`/shop/${product.slug}`} className="link text-sm">
        ← Back to item
      </Link>
      <h1 className="mt-3 text-3xl">Request a reservation</h1>
      <div className="card mt-6 flex gap-4 p-4">
        <ProductImage path={product.images?.[0]?.storage_path} alt={product.title} className="h-24 w-20 flex-none rounded-md" />
        <div>
          <p className="font-display text-lg">{product.title}</p>
          <Price price={Number(product.price)} size="sm" />
        </div>
      </div>
      <div className="card mt-6 p-6">
        {available ? (
          <ReservationForm
            productId={product.id}
            defaults={{ name: profile?.full_name, phone: profile?.phone, email: user.email, preferred: profile?.preferred_contact }}
          />
        ) : (
          <Alert tone="error" title="Not available for reservation">
            This item is currently {product.status === "reserved" ? "reserved" : "not available"}.{" "}
            <Link href={`/shop/${product.slug}`} className="link">
              Ask to be notified
            </Link>{" "}
            if it becomes available.
          </Alert>
        )}
      </div>
    </div>
  );
}
