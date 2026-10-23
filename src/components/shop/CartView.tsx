"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useCart } from "@/components/shop/CartProvider";
import { checkCartAvailabilityAction, submitPurchaseRequestAction, type CartAvailability } from "@/app/(site)/cart/actions";
import { initialState } from "@/lib/actions";
import { formatZAR } from "@/lib/format";
import { PAYMENT_NOTICE } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics-client";
import { ContactFields, type ContactDefaults } from "@/components/forms/ContactFields";
import { CheckboxField, FormMessage, SubmitButton, TextArea } from "@/components/forms/FormBits";
import { EmptyState } from "@/components/ui/EmptyState";

export function CartView({ signedIn, defaults }: { signedIn: boolean; emailVerified: boolean; defaults: ContactDefaults }) {
  const { items, ready, remove, clear } = useCart();
  const [availability, setAvailability] = useState<CartAvailability | null>(null);
  const [state, action] = useActionState(submitPurchaseRequestAction, initialState);
  const idsKey = items.map((i) => i.id).join(",");

  useEffect(() => {
    if (!ready || !idsKey) return;
    let cancelled = false;
    checkCartAvailabilityAction(idsKey.split(",")).then((res) => {
      if (!cancelled) setAvailability(res);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, idsKey, state.ts]);

  useEffect(() => {
    if (state.ok) {
      clear();
      trackEvent("purchase_request");
    }
  }, [state.ok, state.ts, clear]);

  if (state.ok) {
    return (
      <div className="mx-auto max-w-2xl">
        <div role="status" className="card border-success/30 p-8 text-center">
          <p className="eyebrow">Reference {state.data?.reference}</p>
          <h2 className="mt-2 text-3xl">Purchase request submitted</h2>
          <p className="mt-4 text-ink-soft">{state.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/account/requests/${state.data?.id}`} className="btn btn-primary">
              Track this request
            </Link>
            <Link href="/shop" className="btn btn-outline">
              Continue browsing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return <p className="text-ink-soft" aria-busy="true">Loading your request cart…</p>;
  }

  if (!items.length) {
    return (
      <EmptyState title="Your request cart is empty" action={{ href: "/shop", label: "Browse guitars" }}>
        <p>Add guitars from the shop, then send us a purchase request. No payment is taken online.</p>
      </EmptyState>
    );
  }

  const live = (id: string) => availability?.[id];
  const requestable = items.filter((i) => !availability || live(i.id)?.status === "available");
  const total = requestable.reduce((sum, i) => sum + (live(i.id)?.price ?? i.price), 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_26rem]">
      <section aria-labelledby="items-heading">
        <h2 id="items-heading" className="mb-4 text-2xl">
          Items ({items.length})
        </h2>
        <ul className="space-y-3">
          {items.map((item) => {
            const info = live(item.id);
            const unavailable = info && info.status !== "available";
            const priceChanged = info?.price !== null && info?.price !== undefined && info.price !== item.price;
            return (
              <li key={item.id} className={`card flex gap-4 p-3 ${unavailable ? "opacity-70" : ""}`}>
                <Link href={`/shop/${item.slug}`} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-md bg-cream">
                  <Image src={item.image} alt="" fill sizes="6rem" className="object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/shop/${item.slug}`} className="font-display text-lg leading-snug text-walnut no-underline hover:text-gold-ink">
                    {info?.title ?? item.title}
                  </Link>
                  {item.condition && <p className="text-sm text-ink-soft">Condition: {item.condition}</p>}
                  <p className="mt-1 font-semibold text-walnut">{formatZAR(info?.price ?? item.price)}</p>
                  {priceChanged && <p className="text-xs text-warning">The price has changed since you added this item.</p>}
                  {unavailable && (
                    <p className="mt-1 text-sm font-semibold text-danger">
                      {info.status === "reserved" ? "Reserved by another customer" : "No longer available"} — it will not be
                      included in your request.
                    </p>
                  )}
                  <button type="button" onClick={() => remove(item.id)} className="mt-auto self-start pt-2 text-sm text-ink-soft underline underline-offset-2 hover:text-danger">
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-cream p-4">
          <span className="text-sm text-ink-soft">Estimated request total (not an invoice)</span>
          <span className="font-display text-2xl font-semibold text-walnut">{formatZAR(total)}</span>
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          The final price and collection arrangements are confirmed privately by Guitarz4U. This total is not a request for
          payment.
        </p>
      </section>

      <section aria-labelledby="request-heading" className="card h-fit p-6">
        <h2 id="request-heading" className="text-2xl">
          Submit a purchase request
        </h2>
        <p className="notice mt-4 text-sm">{PAYMENT_NOTICE}</p>
        {!signedIn ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-ink-soft">
              Please sign in or create a free account so you can track your request. Your cart will be kept on this device.
            </p>
            <Link href="/login?next=/cart" className="btn btn-primary w-full">
              Sign in
            </Link>
            <Link href="/register?next=/cart" className="btn btn-outline w-full">
              Create an account
            </Link>
          </div>
        ) : (
          <form action={action} className="mt-5 space-y-4">
            {requestable.map((i) => (
              <input key={i.id} type="hidden" name="product_ids" value={i.id} />
            ))}
            <ContactFields defaults={defaults} state={state} />
            <TextArea label="Message (optional)" name="message" maxLength={2000} rows={3} state={state} hint="Questions, preferred collection days, etc. Please don't send banking details." />
            <CheckboxField
              name="understand"
              required
              state={state}
              label="I understand that this is a request only. No payment is taken online, and I will not pay until Guitarz4U has approved my request and sent EFT details privately."
            />
            <FormMessage state={state} />
            <SubmitButton className="btn btn-primary w-full" pendingText="Submitting request…" disabled={!requestable.length}>
              Submit purchase request
            </SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
