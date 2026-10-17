"use client";

import { useActionState } from "react";
import Link from "next/link";
import { addToCart, askQuestion, toggleWishlist } from "@/app/actions/shop";
import { FormResult, SubmitButton } from "../forms/form-bits";
import { Textarea } from "../ui/form";
import { HeartIcon } from "../layout/icons";
import { cn } from "../ui/cn";

export function AddToCartForm({ productId, maxQty }: { productId: string; maxQty: number }) {
  const [state, action] = useActionState(addToCart, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <div className="flex flex-wrap items-center gap-3">
        {maxQty > 1 && (
          <label className="flex items-center gap-2 text-sm text-bone-muted">
            Qty
            <input type="number" name="quantity" min={1} max={maxQty} defaultValue={1} className="w-20 rounded-md border border-ink-400 bg-ink-800 px-2 py-2 text-bone" />
          </label>
        )}
        <SubmitButton size="lg" pendingLabel="Adding…">Add to cart</SubmitButton>
      </div>
      <FormResult state={state} />
      {state?.ok && <Link href="/cart" className="link text-sm">View cart & check out →</Link>}
    </form>
  );
}

export function WishlistButton({ productId, initiallySaved }: { productId: string; initiallySaved: boolean }) {
  const [state, action, pending] = useActionState(toggleWishlist, null);
  const saved = state?.ok ? state.data?.saved : initiallySaved;
  return (
    <form action={action}>
      <input type="hidden" name="productId" value={productId} />
      <button type="submit" disabled={pending} aria-pressed={saved} className={cn("inline-flex h-12 items-center gap-2 rounded-md border px-4 text-sm font-semibold", saved ? "border-amp text-amp" : "border-ink-400 text-bone hover:border-amp hover:text-amp")}>
        <HeartIcon className={cn("h-5 w-5", saved && "fill-amp")} />
        {saved ? "Saved" : "Save to wishlist"}
      </button>
      {state && !state.ok && <p className="mt-2 text-xs text-danger">{state.error} <Link className="link" href="/login">Sign in</Link></p>}
    </form>
  );
}

export function QuestionForm({ productId }: { productId: string }) {
  const [state, action] = useActionState(askQuestion, null);
  if (state?.ok) return <FormResult state={state} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <label htmlFor="question" className="block text-sm font-medium text-bone">Ask a question about this item</label>
      <Textarea id="question" name="question" required minLength={5} maxLength={1000} placeholder="e.g. Has the neck ever been repaired?" />
      <SubmitButton variant="outline" pendingLabel="Sending…">Send question</SubmitButton>
      <FormResult state={state} />
    </form>
  );
}
