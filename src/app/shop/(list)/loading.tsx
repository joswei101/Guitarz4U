import { ProductGridSkeleton } from "@/components/shop/ProductCard";

export default function Loading() {
  return (
    <div className="container-page py-10">
      <div className="skeleton mb-8 h-10 w-72" />
      <ProductGridSkeleton />
    </div>
  );
}
