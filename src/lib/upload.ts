"use client";
import { createClient } from "@/lib/supabase/client";
import { compressImage, randomFileName } from "@/lib/images";

/**
 * Compresses and uploads photos to a PRIVATE bucket under "<userId>/<recordId>/",
 * then records them in the given images table. Storage + database policies
 * ensure customers can only write into their own folder and records.
 */
export async function uploadPrivatePhotos(opts: {
  bucket: "submission-images" | "repair-images";
  table: "seller_submission_images" | "repair_images";
  fkColumn: "submission_id" | "repair_id";
  recordId: string;
  userId: string;
  files: File[];
  onProgress?: (done: number, total: number) => void;
}) {
  const supabase = createClient();
  const errors: string[] = [];
  let done = 0;
  for (const file of opts.files) {
    try {
      const { blob, type } = await compressImage(file);
      const path = `${opts.userId}/${opts.recordId}/${randomFileName(type)}`;
      const { error: upErr } = await supabase.storage.from(opts.bucket).upload(path, blob, { contentType: type, upsert: false });
      if (upErr) throw new Error(upErr.message);
      const row = { [opts.fkColumn]: opts.recordId, storage_path: path } as never;
      const { error: dbErr } = await supabase.from(opts.table).insert(row);
      if (dbErr) {
        await supabase.storage.from(opts.bucket).remove([path]);
        throw new Error(dbErr.message);
      }
    } catch (e) {
      errors.push(`${file.name}: ${(e as Error).message}`);
    }
    done++;
    opts.onProgress?.(done, opts.files.length);
  }
  return { errors };
}
