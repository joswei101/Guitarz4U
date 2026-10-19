"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAlertAction } from "@/app/(site)/shop/actions";
import { BellIcon } from "@/components/ui/Icons";

function useAlert() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (input: Parameters<typeof createAlertAction>[0]) =>
    start(async () => {
      const res = await createAlertAction(input);
      if (res.loginRequired) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      setMessage(res.message ?? null);
    });
  return { message, pending, run };
}

export function ProductAlertButton({ productId }: { productId: string }) {
  const { message, pending, run } = useAlert();
  return (
    <div>
      <button type="button" className="btn btn-outline w-full" disabled={pending} onClick={() => run({ productId })}>
        <BellIcon /> Notify me if it becomes available
      </button>
      {message && (
        <p role="status" className="mt-2 text-sm text-ink-soft">
          {message}
        </p>
      )}
    </div>
  );
}

export function NewArrivalAlertButton({ categoryId, brandId, label }: { categoryId?: number; brandId?: number; label: string }) {
  const { message, pending, run } = useAlert();
  return (
    <div className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-walnut">Looking for something specific?</p>
        <p className="text-sm text-ink-soft">Get an in-app notification when a new {label.toLowerCase()} is listed.</p>
        {message && (
          <p role="status" className="mt-1 text-sm text-success">
            {message}
          </p>
        )}
      </div>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        disabled={pending}
        onClick={() => run({ categoryId, brandId, productId: undefined })}
      >
        <BellIcon className="h-4 w-4" /> Alert me about new arrivals
      </button>
    </div>
  );
}
