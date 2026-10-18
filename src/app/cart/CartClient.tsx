"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cart, useCart } from "@/lib/cart-store";
import type { ProductCard } from "@/lib/products";
import { conditionLabel, formatRand } from "@/lib/format";
import { ContactFields, Field, FormStatus, SpamTrap, inputProps, useSubmit, type ContactDefaults } from "@/components/forms";
import { Empty } from "@/components/ui";

export const SUCCESS_MESSAGE =
  "Your purchase request has been submitted successfully. Guitarz4U will review your request and contact you to confirm availability and arrange payment privately by EFT. No payment has been taken, and your purchase is not confirmed yet.";

export function CartClient({ defaults, loggedIn }: { defaults?: ContactDefaults; loggedIn: boolean }) {
  const ids = useCart();
  const key = ids.join(",");
  const [products, setProducts] = useState<ProductCard[] | null>(null);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [done, setDone] = useState<{ reference: string; id: string } | null>(null);
  const { pending, error, fieldErrors, setState } = useSubmit<{ reference: string; id: string }>("/api/purchase-requests");

  useEffect(() => {
    if (!key) return setProducts([]);
    fetch(`/api/products?ids=${key}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setProducts([]));
  }, [key]);

  if (done) {
    return (
      <div className="card stack narrow" role="status" data-testid="purchase-success">
        <h2>Request sent</h2>
        <p className="notice notice-good" style={{ margin: 0 }}>{SUCCESS_MESSAGE}</p>
        <p>Your reference number is <strong data-testid="purchase-reference">{done.reference}</strong>. Please keep it — you can use it with your email address to check the status.</p>
        <div className="row">
          {loggedIn ? (
            <Link className="btn btn-primary" href={`/account/requests/${done.id}`}>View request status</Link>
          ) : (
            <Link className="btn btn-primary" href={`/track?ref=${done.reference}`}>Track this request</Link>
          )}
          <Link className="btn btn-outline" href="/shop">Continue browsing</Link>
        </div>
      </div>
    );
  }

  if (products === null) return <p className="muted" aria-live="polite">Loading your cart…</p>;

  // Items that were in the cart but are no longer listed (sold, removed) are not returned by the API.
  const missing = ids.filter((id) => !products.find((p) => p.id === id));
  const items = products.filter((p) => ids.includes(p.id));
  const blocked = new Set([...unavailable, ...items.filter((p) => p.status !== "published").map((p) => p.id), ...missing]);
  const requestable = items.filter((p) => !blocked.has(p.id));
  const total = requestable.reduce((s, p) => s + p.priceCents, 0);

  if (ids.length === 0) {
    return (
      <Empty title="Your request cart is empty">
        <p className="muted">Browse the shop and add the guitars you are interested in.</p>
        <Link href="/shop" className="btn btn-primary">Browse guitars</Link>
      </Empty>
    );
  }

  return (
    <div className="detail-grid">
      <section aria-labelledby="items-h">
        <h2 id="items-h">Guitars in your request ({items.length})</h2>
        {missing.length > 0 && (
          <div className="notice notice-warn" style={{ marginBottom: 12 }}>
            <strong>{missing.length} item{missing.length > 1 ? "s are" : " is"} no longer available</strong>
            <p>Something in your cart has been sold or removed from the shop. <button className="link-btn" onClick={() => cart.set(ids.filter((id) => !missing.includes(id)))}>Remove unavailable items</button></p>
          </div>
        )}
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
          {items.map((p) => (
            <li key={p.id} className="card-flat row" style={{ flexWrap: "nowrap", alignItems: "flex-start" }} data-testid="cart-item">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image.url} alt={p.image.alt} width={90} height={110} style={{ width: 90, height: 110, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
              ) : null}
              <div style={{ flex: 1 }}>
                <Link href={`/shop/${p.slug}`}><strong>{p.title}</strong></Link>
                <div className="small muted">{[p.brand, p.model].filter(Boolean).join(" ")} · {p.category} · {conditionLabel(p.condition)}</div>
                <div className="price" style={{ fontSize: "1.15rem" }}>{formatRand(p.priceCents)}</div>
                {blocked.has(p.id) && <span className="tag tag-bad">No longer available</span>}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { cart.remove(p.id); setUnavailable((u) => u.filter((x) => x !== p.id)); }} aria-label={`Remove ${p.title} from request cart`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="card-flat row between" style={{ marginTop: 16 }}>
          <span>
            <strong>Estimated request total</strong>
            <br />
            <span className="small muted">For information only — this is not an invoice or a request for payment. The final price is confirmed privately.</span>
          </span>
          <span className="price" data-testid="cart-total">{formatRand(total)}</span>
        </div>
      </section>

      <section aria-labelledby="send-h">
        <form
          className="card form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (requestable.length === 0) {
              setState({ pending: false, error: "There are no available guitars in your cart to request.", fieldErrors: {} });
              return;
            }
            const fd = new FormData(e.currentTarget);
            setState({ pending: true, error: null, fieldErrors: {} });
            requestable.forEach((p) => fd.append("productIds", p.id));
            const res = await fetch("/api/purchase-requests", { method: "POST", body: fd }).catch(() => null);
            // Use the shared hook for consistent errors, but handle the 409 "unavailable" case here.
            if (res && res.status === 409) {
              const data = await res.json();
              setUnavailable(data.unavailable ?? []);
              setState({ pending: false, error: data.error, fieldErrors: {} });
              return;
            }
            if (!res) {
              setState({ pending: false, error: "We could not reach the server. Please try again.", fieldErrors: {} });
              return;
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.ok) {
              setState({ pending: false, error: data.error || "Something went wrong.", fieldErrors: data.fieldErrors || {} });
              return;
            }
            cart.set(ids.filter((id) => !requestable.find((p) => p.id === id)));
            setDone({ reference: data.reference, id: data.id });
          }}
          noValidate
        >
          <h2 id="send-h" style={{ marginBottom: 0 }}>Send your purchase request</h2>
          <p className="small muted" style={{ margin: 0 }}>We will use these details to contact you about this request only.</p>
          <FormStatus error={error} />
          <ContactFields errors={fieldErrors} defaults={defaults} />
          <Field label="Message (optional)" name="message" error={fieldErrors.message} hint="Questions, preferred collection days, or anything else we should know.">
            <textarea {...inputProps("message", fieldErrors, true)} maxLength={2000} rows={4} />
          </Field>
          <label className="check">
            <input type="checkbox" name="acknowledge" required />
            <span>I understand that this is a purchase request, not a payment. Guitarz4U will contact me to confirm availability, and any payment will be arranged privately by EFT only after approval.</span>
          </label>
          {fieldErrors.acknowledge && <span className="field-error" role="alert">{fieldErrors.acknowledge}</span>}
          <SpamTrap />
          <button className="btn btn-primary btn-block" disabled={pending} data-testid="submit-request">
            {pending ? "Sending request…" : "Submit purchase request"}
          </button>
          {!loggedIn && (
            <p className="small muted" style={{ margin: 0 }}>
              Tip: <Link href="/login?next=/cart">log in</Link> or <Link href="/register">create an account</Link> to track your requests in one place.
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
