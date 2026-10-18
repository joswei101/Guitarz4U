"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { useCart, type CartItem } from "./CartProvider";
import { getCartProducts, submitPurchaseRequest } from "@/app/actions/shop";
import { ContactFields, type ContactDefaults } from "@/components/forms/ContactFields";
import { Honeypot, TextArea } from "@/components/forms/Field";
import { ProductImage } from "@/components/shop/ProductImage";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRand } from "@/lib/format";
import { productStatusLabel } from "@/lib/constants";

type Fresh = Awaited<ReturnType<typeof getCartProducts>>[number];

export function CartView({ signedIn, defaults }: { signedIn: boolean; defaults: ContactDefaults }) {
  const cart = useCart();
  const router = useRouter();
  const [fresh, setFresh] = useState<Record<string, Fresh> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const ids = cart.items.map((i) => i.id).join(",");

  // Always re-check prices and availability against the database.
  useEffect(() => {
    if (!cart.ready) return;
    if (!ids) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when cart is emptied
      setFresh({});
      return;
    }
    let cancelled = false;
    getCartProducts(ids.split(","))
      .then((rows) => {
        if (cancelled) return;
        setFresh(Object.fromEntries(rows.map((r) => [r.id, r])));
      })
      .catch(() => !cancelled && setError("We couldn't refresh your cart. Please reload the page."));
    return () => {
      cancelled = true;
    };
  }, [ids, cart.ready]);

  if (!cart.ready || fresh === null) {
    return (
      <div className="flex items-center gap-3 text-tan" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading your cart…
      </div>
    );
  }

  if (!cart.items.length) {
    return (
      <EmptyState title="Your request cart is empty" action={{ href: "/shop", label: "Browse the shop" }}>
        Add guitars or equipment you&apos;re interested in, then send us one enquiry.
      </EmptyState>
    );
  }

  const isAvailable = (item: CartItem) => {
    const f = fresh[item.id];
    return Boolean(f && f.status === "published" && f.quantity >= item.quantity);
  };
  const availableItems = cart.items.filter(isAvailable);
  const unavailableItems = cart.items.filter((i) => !isAvailable(i));
  const total = availableItems.reduce((sum, i) => sum + Number(fresh[i.id]?.price ?? i.price) * i.quantity, 0);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setFieldErrors({});
    if (formData.get("website")) return;
    startTransition(async () => {
      const res = await submitPurchaseRequest({
        contact_name: formData.get("contact_name"),
        contact_phone: formData.get("contact_phone"),
        contact_email: formData.get("contact_email"),
        preferred_contact: formData.get("preferred_contact"),
        message: formData.get("message"),
        items: availableItems.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      });
      if (!res.ok) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        // Refresh availability in case something sold in the meantime
        getCartProducts(cart.items.map((i) => i.id)).then((rows) => setFresh(Object.fromEntries(rows.map((r) => [r.id, r]))));
        return;
      }
      cart.clear();
      router.push(`/account/requests/${res.data!.id}?submitted=1`);
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <section aria-labelledby="items-h">
        <h2 id="items-h" className="text-2xl">
          Items ({cart.items.length})
        </h2>
        {unavailableItems.length > 0 && (
          <Alert tone="warning" className="mt-4" title="Some items are no longer available">
            They have been sold, reserved or changed since you added them and will not be included in your request.
          </Alert>
        )}
        <ul className="mt-4 space-y-3">
          {cart.items.map((item) => {
            const f = fresh[item.id];
            const ok = isAvailable(item);
            const priceChanged = f && Number(f.price) !== item.price;
            return (
              <li key={item.id} className={`card flex gap-4 p-4 ${ok ? "" : "opacity-70"}`}>
                <ProductImage path={f?.image_path ?? item.image} alt={item.title} className="h-24 w-20 flex-none rounded-md" />
                <div className="min-w-0 flex-1">
                  <Link href={`/shop/${item.slug}`} className="font-display text-lg hover:underline">
                    {f?.title ?? item.title}
                  </Link>
                  <p className="font-semibold">{formatRand(Number(f?.price ?? item.price))}</p>
                  {priceChanged && <p className="text-xs text-warning">Price updated since you added it.</p>}
                  {!ok && (
                    <p className="text-sm font-semibold text-danger">
                      {f ? `Not available (${productStatusLabel(f.status)})` : "No longer listed"}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {ok && item.maxQuantity > 1 && (
                      <div className="inline-flex items-center rounded-md border border-tan/50" role="group" aria-label="Quantity">
                        <button type="button" className="btn btn-ghost btn-sm" aria-label="Decrease quantity" onClick={() => cart.setQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-4 w-4" aria-hidden />
                        </button>
                        <span className="w-8 text-center" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button type="button" className="btn btn-ghost btn-sm" aria-label="Increase quantity" onClick={() => cart.setQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm text-danger" onClick={() => cart.remove(item.id)}>
                      <Trash2 className="h-4 w-4" aria-hidden /> Remove
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-gold/40 pt-4">
          <span className="font-semibold">Estimated total</span>
          <span className="font-display text-2xl">{formatRand(total)}</span>
        </div>
        <p className="mt-1 text-xs text-tan">Estimate only. Final price and availability are confirmed by Guitarz4U.</p>
      </section>

      <section aria-labelledby="send-h" className="card h-fit p-6">
        <h2 id="send-h" className="text-2xl">
          Send your request
        </h2>
        {!signedIn ? (
          <div className="mt-4 space-y-4">
            <p>Please sign in or create a free account so you can track your request. Your cart will be kept.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login?next=/cart" className="btn btn-primary">
                Sign in
              </Link>
              <Link href="/register?next=/cart" className="btn btn-outline">
                Create account
              </Link>
            </div>
            <p className="text-sm text-tan">Prefer not to register? Send us the item links on WhatsApp instead.</p>
          </div>
        ) : availableItems.length === 0 ? (
          <Alert tone="warning" className="mt-4">
            None of the items in your cart are currently available.
          </Alert>
        ) : (
          <form ref={formRef} onSubmit={submit} className="mt-4 space-y-5" noValidate>
            <Honeypot />
            {error && <Alert tone="error">{error}</Alert>}
            <ContactFields defaults={defaults} errors={fieldErrors} />
            <TextArea label="Message (optional)" name="message" maxLength={2000} rows={4} hint="Questions, viewing requests or collection preferences." />
            <Alert tone="info">
              Submitting sends an <strong>enquiry</strong>. Guitarz4U will contact you to confirm availability and
              payment arrangements. No payment is taken and this is not a completed purchase.
            </Alert>
            <button type="submit" className="btn btn-primary w-full" disabled={pending} aria-busy={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Sending…
                </>
              ) : (
                `Submit purchase request (${availableItems.length} item${availableItems.length === 1 ? "" : "s"})`
              )}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
