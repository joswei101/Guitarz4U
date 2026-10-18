"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhotoPicker } from "@/components/forms/PhotoPicker";
import { uploadPrivatePhotos } from "@/lib/upload";

export function AddPhotos(props: {
  bucket: "submission-images" | "repair-images";
  table: "seller_submission_images" | "repair_images";
  fkColumn: "submission_id" | "repair_id";
  recordId: string;
  userId: string;
  remaining: number;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (props.remaining <= 0) return <p className="text-sm text-tan">Photo limit reached.</p>;
  return (
    <div className="space-y-3">
      <PhotoPicker files={files} onChange={setFiles} max={props.remaining} label="Add more photos" />
      {files.length > 0 && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const { errors } = await uploadPrivatePhotos({ ...props, files, onProgress: (d, t) => setStatus(`Uploading ${d}/${t}…`) });
              setFiles([]);
              setStatus(errors.length ? `Some photos failed: ${errors.join("; ")}` : "Photos uploaded.");
              router.refresh();
            })
          }
        >
          {pending ? (status ?? "Uploading…") : `Upload ${files.length} photo${files.length === 1 ? "" : "s"}`}
        </button>
      )}
      {status && !pending && <p role="status" className="text-sm">{status}</p>}
    </div>
  );
}
