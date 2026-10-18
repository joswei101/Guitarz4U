"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cart, recentlyViewed, useCart } from "@/lib/cart-store";
import { ContactFields, Field, FormStatus, SpamTrap, inputProps, useSubmit } from "./forms";
import { IconCart, IconHeart, IconShare, IconWhatsApp } from "./icons";

type Props = {
  product: { id: string; title: string; slug: string; priceCents: number };
  available: boolean;
  reserved: boolean;
  wishlisted: boolean;
  user: { name: string; email: string } | null;
  whatsappHref: string;
};

export function ProductActions({ product, available, reserved, wishlisted, user, whatsappHref }: Props) {
  const ids = useCart();
  const inCart = ids.includes(product.id);
  const [wish, setWish] = useState(wishlisted);
  const [panel, setPanel] = useState<"" | "reserve" | "question" | "alert">("");
  const [shareMsg, setShareMsg] = useState("");
  const [wishMsg, setWishMsg] = useState("");

  useEffect(() => {
    recentlyViewed.push(product.id);
    try {
      navigator.sendBeacon?.("/api/track", new Blob([JSON.stringify({ event: "product_view", productId: product.id, path: location.pathname })], { type: "application/json" }));
    } catch {}
  }, [product.id]);

  async function toggleWish() {
    const next = !wish;
    setWish(next);
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product.id, saved: next }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setWish(!next);
      setWishMsg("Could not update your wishlist. Please try again.");
    } else setWishMsg(next ? "Saved to your wishlist." : "Removed from your wishlist.");
  }

  async function share() {
    const url = location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, text: `${product.title} at Guitarz4U`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copied to your clipboard.");
    } catch {
      setShareMsg("Copy this link to share: " + url);
    }
  }

  return (
    <div className="stack">
      {available ? (
        inCart ? (
          <div className="notice notice-good" role="status">
            <strong>In your request cart</strong>
            <p><Link href="/cart">Review your cart and send the purchase request →</Link></p>
          </div>
        ) : (
          <button className="btn btn-primary btn-block" type="button" onClick={() => cart.add(product.id)} data-testid="add-to-cart">
            <IconCart /> Add to request cart
          </button>
        )
      ) : (
        <div className="notice notice-warn" role="status">
          <strong>{reserved ? "Currently reserved" : "Not available"}</strong>
          <p>{reserved ? "Another customer has a confirmed reservation on this guitar. Ask us to let you know if it becomes available again." : "This guitar cannot be requested at the moment."}</p>
        </div>
      )}

      <div className="actions-grid">
        {available && (
          <button className="btn btn-outline" type="button" onClick={() => setPanel(panel === "reserve" ? "" : "reserve")} aria-expanded={panel === "reserve"}>
            Request reservation
          </button>
        )}
        {reserved && (
          <button className="btn btn-outline" type="button" onClick={() => setPanel(panel === "alert" ? "" : "alert")} aria-expanded={panel === "alert"}>
            Notify me if available
          </button>
        )}
        {user ? (
          <button className="btn btn-ghost" type="button" onClick={toggleWish} aria-pressed={wish} data-testid="wishlist-toggle">
            <IconHeart filled={wish} /> {wish ? "Saved" : "Add to wishlist"}
          </button>
        ) : (
          <Link className="btn btn-ghost" href={`/login?next=/shop/${product.slug}`}>
            <IconHeart /> Log in to save
          </Link>
        )}
        <button className="btn btn-ghost" type="button" onClick={() => setPanel(panel === "question" ? "" : "question")} aria-expanded={panel === "question"}>
          Ask a question
        </button>
        <a className="btn btn-whatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer" data-track="whatsapp_click" data-product={product.id}>
          <IconWhatsApp /> WhatsApp
        </a>
        <button className="btn btn-ghost" type="button" onClick={share}>
          <IconShare /> Share
        </button>
      </div>
      <div aria-live="polite" className="small muted">{wishMsg || shareMsg}</div>

      {panel === "reserve" && <ReservationForm productId={product.id} user={user} />}
      {panel === "question" && <QuestionForm productId={product.id} title={product.title} user={user} />}
      {panel === "alert" && <AlertForm productId={product.id} user={user} />}
    </div>
  );
}

function ReservationForm({ productId, user }: { productId: string; user: Props["user"] }) {
  const { pending, error, fieldErrors, submit } = useSubmit<{ reference: string }>("/api/reservations");
  const [done, setDone] = useState<string | null>(null);
  if (done)
    return (
      <div className="notice notice-good" role="status" data-testid="reservation-success">
        <strong>Reservation request received — not yet confirmed</strong>
        <p>Your reference is <strong>{done}</strong>. Guitarz4U will review your request and contact you. The guitar is <em>not</em> reserved for you until we confirm it.</p>
      </div>
    );
  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("productId", productId);
        const res = await submit(fd);
        if (res) setDone(res.reference);
      }}
    >
      <h3>Request a reservation</h3>
      <p className="small muted">A reservation is only confirmed once Guitarz4U approves it. Approved reservations are held for a limited time while we arrange the sale.</p>
      <FormStatus error={error} />
      <ContactFields errors={fieldErrors} defaults={{ name: user?.name, email: user?.email }} />
      <Field label="Message (optional)" name="message" error={fieldErrors.message}>
        <textarea {...inputProps("message", fieldErrors)} maxLength={2000} rows={3} />
      </Field>
      <SpamTrap />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Send reservation request"}</button>
    </form>
  );
}

function QuestionForm({ productId, title, user }: { productId: string; title: string; user: Props["user"] }) {
  const { pending, error, fieldErrors, submit } = useSubmit("/api/contact");
  const [done, setDone] = useState(false);
  if (done)
    return (
      <div className="notice notice-good" role="status">
        <strong>Question sent</strong>
        <p>Thank you. Guitarz4U will reply using your preferred contact method.</p>
      </div>
    );
  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("productId", productId);
        fd.set("subject", `Question about: ${title}`);
        if (await submit(fd)) setDone(true);
      }}
    >
      <h3>Ask about this guitar</h3>
      <FormStatus error={error} />
      <ContactFields errors={fieldErrors} defaults={{ name: user?.name, email: user?.email }} emailRequired={false} />
      <Field label="Your question" name="message" required error={fieldErrors.message}>
        <textarea {...inputProps("message", fieldErrors)} required minLength={5} maxLength={4000} rows={4} />
      </Field>
      <SpamTrap />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Send question"}</button>
    </form>
  );
}

function AlertForm({ productId, user }: { productId: string; user: Props["user"] }) {
  const { pending, error, fieldErrors, submit } = useSubmit("/api/alerts");
  const [done, setDone] = useState(false);
  if (done)
    return (
      <div className="notice notice-good" role="status">
        <strong>We will let you know</strong>
        <p>If this guitar becomes available again, you will get a notification{user ? " in your account" : ""}{" "}and an email if email delivery is set up.</p>
      </div>
    );
  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("productId", productId);
        if (await submit(fd)) setDone(true);
      }}
    >
      <FormStatus error={error} />
      <Field label="Email address" name="email" required error={fieldErrors.email}>
        <input type="email" {...inputProps("email", fieldErrors)} required defaultValue={user?.email} />
      </Field>
      <SpamTrap />
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Notify me"}</button>
    </form>
  );
}
