"use client";

import { createClient } from "@/lib/supabase/client";

export const MAX_SOURCE_BYTES = 25 * 1024 * 1024; // phones can produce large photos; they are resized before upload
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600;

/**
 * Resizes and re-encodes a photo in the browser before upload. This keeps
 * uploads fast on mobile data, stays well inside the free storage limits and
 * strips most metadata (including GPS location) from the original file.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file (JPEG, PNG or WebP).");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("That photo is too large. Please choose one under 25 MB.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image format isn't supported by your browser. Please use a JPEG or PNG photo.");
  }
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
  let blob = await toBlob("image/webp", 0.82);
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", 0.85);
  if (!blob) throw new Error("Could not process the image.");
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error("That photo is still too large after resizing.");
  return blob;
}

export async function uploadImage(bucket: "customer-uploads" | "product-images", folder: string, file: File) {
  const blob = await compressImage(file);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient().storage.from(bucket).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error("Upload failed. Please check your connection and try again.");
  return { path, previewUrl: URL.createObjectURL(blob) };
}
