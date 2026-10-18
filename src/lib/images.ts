import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { putObject, type Bucket } from "./storage";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);

export class UploadError extends Error {}

/**
 * Validates an uploaded image by decoding it (not by trusting its filename or
 * MIME type), auto-rotates it, strips all metadata (including GPS location),
 * resizes it and stores it as WebP.
 */
export async function processAndStoreImage(file: File, bucket: Bucket, prefix: string) {
  if (file.size === 0) throw new UploadError("One of the images is empty.");
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("Each image must be smaller than 8 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new UploadError(`"${file.name}" is not a supported image. Please use JPG, PNG or WebP.`);
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new UploadError(`"${file.name}" is not a supported image. Please use JPG, PNG or WebP.`);
  }
  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const key = `${prefix}/${randomUUID()}.webp`;
  await putObject(bucket, key, data, "image/webp");
  return { key, width: info.width, height: info.height };
}

/** Pulls image files out of a form, enforcing a maximum count. */
export function getImageFiles(form: FormData, field: string, max: number): File[] {
  const files = form.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > max) throw new UploadError(`Please upload no more than ${max} photos.`);
  return files;
}
