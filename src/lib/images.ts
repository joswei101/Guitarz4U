import { SUPABASE_URL } from "@/lib/env";

/**
 * Resolves a stored image path to a URL.
 * - Paths starting with "/" or "http" are used as-is (e.g. demo illustrations).
 * - Anything else is an object in the public "product-images" bucket.
 */
export function productImageUrl(path: string | null | undefined): string {
  if (!path) return "/images/placeholder-guitar.svg";
  if (path.startsWith("/") || path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/product-images/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
