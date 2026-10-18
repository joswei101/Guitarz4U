import { SUPABASE_URL } from "@/lib/env";

/** Public URL for an image in a public bucket, or a bundled static asset ("/demo/..."). */
export function publicImageUrl(path: string | null | undefined, bucket = "product-images") {
  if (!path) return null;
  if (path.startsWith("/") || path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/**
 * Resize and re-encode an image in the browser before upload. This keeps
 * uploads small (good for slow connections and the free storage quota) and
 * strips metadata such as GPS location from phone photos.
 */
export async function compressImage(
  file: File,
  maxSize = 1600,
  quality = 0.82,
): Promise<{ blob: Blob; width: number; height: number; type: string }> {
  if (!file.type.startsWith("image/")) throw new Error(`"${file.name}" is not an image.`);
  if (file.size > 25 * 1024 * 1024) throw new Error(`"${file.name}" is too large (max 25 MB before compression).`);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(`"${file.name}" could not be read. Please use a JPG, PNG or WebP photo.`);
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process this image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
  let blob = await toBlob("image/webp");
  let type = "image/webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob("image/jpeg");
    type = "image/jpeg";
  }
  if (!blob) throw new Error("Image compression failed.");
  if (blob.size > 5 * 1024 * 1024) throw new Error(`"${file.name}" is still too large after compression.`);
  return { blob, width, height, type };
}

export function randomFileName(type: string) {
  const ext = type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";
  return `${crypto.randomUUID()}.${ext}`;
}
