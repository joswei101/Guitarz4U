"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useCart, type CartItem } from "@/components/shop/CartProvider";
import { rememberViewed } from "@/components/shop/RecentlyViewed";
import { toggleWishlistAction } from "@/app/(site)/shop/actions";
import { trackEvent } from "@/lib/analytics-client";
import { CartIcon, CheckIcon, HeartIcon, ShareIcon, WhatsAppIcon } from "@/components/ui/Icons";

export function AddToCartButton({ item, disabled }: { item: CartItem; disabled?: boolean }) {
  const { add, has, ready } = useCart();
  const inCart = ready && has(item.id);
  if (inCart) {
    return (
      <Link href="/cart" className="btn btn-gold w-full">
        <CheckIcon /> In your request cart — view cart
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="btn btn-primary w-full"
      disabled={disabled || !ready}
      onClick={() => {
        add(item);
        trackEvent("cart_add", item.id);
      }}
    >
      <CartIcon /> Add to request cart
    </button>
  );
}

export function WishlistButton({ productId, initialSaved }: { productId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div>
      <button
        type="button"
        className="btn btn-outline w-full"
        aria-pressed={saved}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await toggleWishlistAction(productId);
            if (res.loginRequired) {
              router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
              return;
            }
            if (res.ok) {
              setSaved(Boolean(res.saved));
              setMessage(res.saved ? "Saved to your wishlist." : "Removed from your wishlist.");
              if (res.saved) trackEvent("wishlist_add", productId);
            } else setMessage(res.message ?? "Something went wrong.");
          })
        }
      >
        <HeartIcon filled={saved} className={`h-5 w-5 ${saved ? "text-danger" : ""}`} />
        {saved ? "Saved to wishlist" : "Add to wishlist"}
      </button>
      {message && (
        <p role="status" className="mt-1 text-center text-xs text-ink-soft">
          {message}
        </p>
      )}
    </div>
  );
}

export function WhatsAppProductLink({ href, productId }: { href: string; productId: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="btn btn-whatsapp w-full" onClick={() => trackEvent("whatsapp_click", productId)}>
      <WhatsAppIcon /> Ask about this guitar on WhatsApp
    </a>
  );
}

export function ShareButton({ url, title, productId }: { url: string; title: string; productId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="btn btn-outline w-full"
        onClick={async () => {
          trackEvent("share", productId);
          try {
            if (navigator.share) {
              await navigator.share({ title, url });
              return;
            }
            await navigator.clipboard.writeText(url);
            setStatus("Link copied to clipboard.");
          } catch {
            setStatus(`Copy this link: ${url}`);
          }
        }}
      >
        <ShareIcon /> Share
      </button>
      {status && (
        <p role="status" className="mt-1 break-all text-center text-xs text-ink-soft">
          {status}
        </p>
      )}
    </div>
  );
}

/** Records the view for "recently viewed" (in this browser) and anonymous analytics. */
export function TrackProductView({ item }: { item: { id: string; slug: string; title: string; price: number; image: string } }) {
  useEffect(() => {
    rememberViewed(item);
    trackEvent("product_view", item.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  return null;
}
