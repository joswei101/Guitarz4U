"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, CalendarClock, Check, Heart, Share2, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { toggleAvailabilityAlert, toggleWishlist } from "@/app/actions/shop";
import { whatsappLink } from "@/lib/whatsapp";
import { track } from "@/lib/track";
import { rememberViewed } from "./RecentlyViewed";

type Props = {
  product: { id: string; slug: string; title: string; price: number; status: string; quantity: number; image: string | null };
  signedIn: boolean;
  inWishlist: boolean;
  alertActive: boolean;
  whatsappNumber: string;
  productUrl: string;
};

export function ProductActions({ product, signedIn, inWishlist, alertActive, whatsappNumber, productUrl }: Props) {
  const cart = useCart();
  const router = useRouter();
  const [saved, setSaved] = useState(inWishlist);
  const [alert, setAlert] = useState(alertActive);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const available = product.status === "published" && product.quantity > 0;
  const inCart = cart.ready && cart.has(product.id);

  useEffect(() => {
    track("product_view", product.id);
    rememberViewed({ id: product.id, slug: product.slug, title: product.title, price: product.price, image: product.image });
  }, [product.id, product.slug, product.title, product.price, product.image]);

  const addToCart = () => {
    cart.add({
      id: product.id,
      slug: product.slug,
      title: product.title,
      price: product.price,
      image: product.image,
      maxQuantity: Math.max(1, Math.min(product.quantity, 99)),
    });
    setMessage({ tone: "ok", text: "Added to your request cart." });
  };

  const needLogin = () => router.push(`/login?next=${encodeURIComponent(`/shop/${product.slug}`)}`);

  const share = async () => {
    const data = { title: product.title, text: `${product.title} at Guitarz4U`, url: productUrl };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(productUrl);
        setMessage({ tone: "ok", text: "Link copied to clipboard." });
      }
      track("share", product.id);
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="space-y-3">
      {available ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {inCart ? (
              <Link href="/cart" className="btn btn-primary">
                <Check className="h-4 w-4" aria-hidden /> In your cart — view
              </Link>
            ) : (
              <button type="button" className="btn btn-primary" onClick={addToCart}>
                <ShoppingBag className="h-4 w-4" aria-hidden /> Add to request cart
              </button>
            )}
            <button
              type="button"
              className="btn btn-gold"
              onClick={() => {
                if (!inCart) addToCart();
                router.push("/cart");
              }}
            >
              Request to buy
            </button>
          </div>
          <Link href={`/shop/${product.slug}/reserve`} className="btn btn-outline w-full">
            <CalendarClock className="h-4 w-4" aria-hidden /> Request a reservation
          </Link>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-outline w-full"
          disabled={pending}
          onClick={() => {
            if (!signedIn) return needLogin();
            startTransition(async () => {
              const res = await toggleAvailabilityAlert(product.id);
              if (res.ok) {
                setAlert(Boolean(res.data?.active));
                setMessage({ tone: "ok", text: res.message ?? "Saved." });
              } else setMessage({ tone: "err", text: res.error });
            });
          }}
        >
          {alert ? <BellOff className="h-4 w-4" aria-hidden /> : <Bell className="h-4 w-4" aria-hidden />}
          {alert ? "Stop availability alert" : "Notify me if it becomes available"}
        </button>
      )}

      <a
        href={whatsappLink(whatsappNumber, `Hi Guitarz4U, I'm interested in "${product.title}": ${productUrl}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-whatsapp w-full"
        onClick={() => track("whatsapp_click", product.id)}
      >
        <WhatsAppIcon /> Ask about this item on WhatsApp
      </a>

      <div className="flex gap-3">
        <button
          type="button"
          className="btn btn-ghost flex-1"
          disabled={pending}
          aria-pressed={saved}
          onClick={() => {
            if (!signedIn) return needLogin();
            startTransition(async () => {
              const res = await toggleWishlist(product.id);
              if (res.ok) {
                setSaved(Boolean(res.data?.saved));
                setMessage({ tone: "ok", text: res.data?.saved ? "Saved to your wishlist." : "Removed from your wishlist." });
              } else setMessage({ tone: "err", text: res.error });
            });
          }}
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-danger text-danger" : ""}`} aria-hidden />
          {saved ? "In wishlist" : "Add to wishlist"}
        </button>
        <button type="button" className="btn btn-ghost flex-1" onClick={share}>
          <Share2 className="h-4 w-4" aria-hidden /> Share
        </button>
      </div>

      <p aria-live="polite" className={`min-h-5 text-sm ${message?.tone === "err" ? "text-danger" : "text-success"}`}>
        {message?.text}
      </p>
    </div>
  );
}
