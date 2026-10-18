"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import type { ActionResult } from "@/lib/validation";
import { uploadPrivatePhotos } from "@/lib/upload";

/** Create a record with a server action, then upload its photos, then go to its status page. */
export function useRecordWithPhotos(opts: {
  action: (fd: FormData) => Promise<ActionResult<{ id: string; reference: string }>>;
  bucket: "submission-images" | "repair-images";
  table: "seller_submission_images" | "repair_images";
  fkColumn: "submission_id" | "repair_id";
  userId: string;
  statusPath: (id: string) => string;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setErrors({});
    startTransition(async () => {
      setProgress("Saving your details…");
      const res = await opts.action(formData);
      if (!res.ok) {
        setProgress(null);
        setError(res.error);
        setErrors(res.fieldErrors ?? {});
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const id = res.data!.id;
      let photoErrors: string[] = [];
      if (files.length) {
        const r = await uploadPrivatePhotos({
          bucket: opts.bucket,
          table: opts.table,
          fkColumn: opts.fkColumn,
          recordId: id,
          userId: opts.userId,
          files,
          onProgress: (d, t) => setProgress(`Uploading photos (${d}/${t})…`),
        });
        photoErrors = r.errors;
      }
      router.push(`${opts.statusPath(id)}?submitted=1${photoErrors.length ? `&photoErrors=${photoErrors.length}` : ""}`);
    });
  };

  return { files, setFiles, error, errors, progress, pending, submit };
}
