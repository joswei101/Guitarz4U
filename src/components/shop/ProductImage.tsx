/* eslint-disable @next/next/no-img-element -- images are pre-optimised on upload; plain <img> keeps us inside free tiers */
import { publicImageUrl } from "@/lib/images";
import { LogoMark } from "@/components/Logo";

export function ProductImage({
  path,
  alt,
  className = "",
  priority = false,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const url = publicImageUrl(path);
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-cream-2 ${className}`} role="img" aria-label={`${alt} (no photo yet)`}>
        <LogoMark className="h-16 w-16 opacity-40" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className={`bg-cream-2 object-cover ${className}`}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
    />
  );
}
