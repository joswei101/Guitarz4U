import type { Metadata } from 'next';
import Link from 'next/link';
import { removeFromCart } from '@/app/actions/public';
import { EnquiryForm } from '@/components/PublicForms';
import { AvailabilityBadge } from '@/components/ProductCard';
import { Flash } from '@/components/Flash';
import { PageHero } from '@/components/PageHero';
import { SubmitButton } from '@/components/forms';
import { getProfile, getUser } from '@/lib/auth';
import { readCart } from '@/lib/cart';
import { formatZAR } from '@/lib/format';
import { expireReservations, getProductsByIds, imageUrl, sortImages } from '@/lib/products';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Enquiry cart', robots: { index: false } };

export default async function CartPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await expireReservations();
  const sp = await searchParams;
  const [ids, user, profile] = await Promise.all([readCart(), getUser(), getProfile()]);
  const products = await getProductsByIds(ids);
  const supabase = await createClient();
  const { data: mine } = user
    ? await supabase.from('reservations').select('product_id').eq('user_id', user.id).eq('status', 'active')
    : { data: [] as { product_id: string }[] };
  const myReserved = new Set((mine ?? []).map((r) => r.product_id));
  const isOk = (p: (typeof products)[number]) => p.status === 'available' || (p.status === 'reserved' && myReserved.has(p.id));
  const unavailable = products.filter((p) => !isOk(p));
  const total = products.filter(isOk).reduce((s, p) => s + Number(p.price), 0);

  return (
    <>
      <PageHero title="Enquiry cart" intro="Tell us which guitars you're interested in. This is not a checkout — no payment is taken on this website." />
      <div className="section">
        <div className="wrap grid-2" style={{ alignItems: 'start' }}>
          <div className="stack">
            <Flash ok={sp.ok} error={sp.error} />
            {sp.sent && /^ENQ-\d+$/.test(sp.sent) ? (
              <div className="card" role="status">
                <h2>Enquiry sent — thank you!</h2>
                <p>Your enquiry {sp.sent} has been sent. The owner will contact you soon to confirm the details, payment and collection.</p>
                <p><strong>No payment has been taken, and the sale is not final</strong> until it has been agreed with the owner. We&apos;ve emailed you a copy.</p>
                <div className="row"><Link href="/shop" className="btn btn-outline">Keep browsing</Link>{user ? <Link href="/account/enquiries" className="btn btn-primary">My enquiries</Link> : null}</div>
              </div>
            ) : null}
            {products.length === 0 && !sp.sent ? (
              <div className="empty-state">
                <h2>Your enquiry cart is empty</h2>
                <p>Add guitars from the shop to ask about several at once.</p>
                <Link href="/shop" className="btn btn-primary">Browse guitars</Link>
              </div>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="data">
                    <caption className="visually-hidden">Guitars in your enquiry cart</caption>
                    <thead><tr><th scope="col">Guitar</th><th scope="col">Availability</th><th scope="col" className="num">Price</th><th scope="col"><span className="visually-hidden">Remove</span></th></tr></thead>
                    <tbody>
                      {products.map((p) => {
                        const img = sortImages(p.product_images)[0];
                        return (
                          <tr key={p.id}>
                            <td>
                              <div className="row" style={{ flexWrap: 'nowrap' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {img ? <img src={imageUrl(img.thumb_path ?? img.path)!} alt="" width={48} height={60} style={{ width: 48, height: 60, objectFit: 'cover', borderRadius: 4 }} /> : null}
                                <Link href={`/shop/${p.slug}`}>{p.brand} {p.model}</Link>
                              </div>
                            </td>
                            <td>
                              <AvailabilityBadge status={p.status} />
                              {p.status === 'reserved' && myReserved.has(p.id) ? <div className="small muted">Reserved by you</div> : null}
                            </td>
                            <td className="num">{formatZAR(p.price)}</td>
                            <td>
                              <form action={removeFromCart}>
                                <input type="hidden" name="product_id" value={p.id} />
                                <SubmitButton className="link-button" pendingText="Removing…">Remove</SubmitButton>
                              </form>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot><tr><th scope="row" colSpan={2}>Total of available guitars (for reference)</th><td className="num"><strong>{formatZAR(total)}</strong></td><td /></tr></tfoot>
                  </table>
                </div>
                {unavailable.length ? (
                  <div className="alert alert-error" role="alert">
                    {unavailable.map((p) => `${p.brand} ${p.model}`).join(', ')} {unavailable.length === 1 ? 'is' : 'are'} no longer available. Please remove {unavailable.length === 1 ? 'it' : 'them'} before sending your enquiry.
                  </div>
                ) : null}
                <div className="payment-note">
                  <strong>How this works:</strong> sending this enquiry tells the owner which guitars you want. It is <strong>not a payment</strong> and does not complete a sale.
                  The owner will contact you to confirm availability, agree payment (usually EFT) and arrange <strong>collection</strong> in Sandringham, Johannesburg. We do not deliver.
                </div>
              </>
            )}
          </div>
          {products.length && !unavailable.length ? (
            <EnquiryForm defaults={{ name: profile?.full_name ?? undefined, email: user?.email ?? undefined, phone: profile?.whatsapp ?? undefined }} />
          ) : null}
        </div>
      </div>
    </>
  );
}
