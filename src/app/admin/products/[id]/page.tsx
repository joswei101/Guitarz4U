import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deleteDraftProduct, setProductStatus, staffReserve, updateImage } from '@/app/actions/admin-catalogue';
import { Flash } from '@/components/Flash';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmButton, SubmitButton } from '@/components/forms';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { PaymentsPanel } from '@/components/admin/PaymentsPanel';
import { ProductForm } from '@/components/admin/ProductForm';
import { profileHasPerm, requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatDateTime, formatZAR } from '@/lib/format';
import { OFFER_STATUS, PRODUCT_STATUS, RESERVATION_STATUS, label } from '@/lib/labels';
import { imageUrl, sortImages, type ImageRow } from '@/lib/products';
import { getSettings } from '@/lib/site';

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { profile } = await requireStaff('inventory');
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: p } = await supabase.from('products').select('*, product_images(id, path, thumb_path, alt, sort_order, width, height)').eq('id', id).maybeSingle();
  if (!p) notFound();
  const [{ data: priv }, { data: reservations }, { data: offers }, settings] = await Promise.all([
    supabase.from('product_private').select('*').eq('product_id', id).maybeSingle(),
    supabase.from('reservations').select('id, ref, status, contact_name, expires_at, created_at, source').eq('product_id', id).order('created_at', { ascending: false }),
    supabase.from('offers').select('id, ref, name, amount, status, created_at').eq('product_id', id).order('created_at', { ascending: false }),
    getSettings(),
  ]);
  const images = sortImages(p.product_images as ImageRow[]);
  const name = `${p.brand} ${p.model}`;
  const statusButton = (status: string, text: string, msg: string, cls = 'btn btn-outline btn-small') => (
    <form action={setProductStatus}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={status} />
      <ConfirmButton message={msg} className={cls}>{text}</ConfirmButton></form>
  );

  return (
    <>
      <p><Link href="/admin/products">← All products</Link></p>
      <Flash ok={sp.ok} error={sp.error} />
      <div className="row-between">
        <h1 style={{ margin: 0 }}>{name}</h1>
        <StatusBadge status={p.status} text={label(PRODUCT_STATUS, p.status)} />
      </div>
      <p className="muted">{p.ref} · created {formatDate(p.created_at)} · updated {formatDateTime(p.updated_at)}{p.sold_at ? ` · sold ${formatDate(p.sold_at)}` : ''}</p>

      <section className="card">
        <h2 style={{ fontSize: '1.15rem' }}>Status</h2>
        <div className="row">
          <Link className="btn btn-outline btn-small" href={`/shop/${p.slug}`} target="_blank">Preview listing</Link>
          {p.status === 'draft' ? statusButton('available', 'Publish', images.length ? 'Publish this guitar to the shop now?' : 'This listing has no photos. Publish anyway?', 'btn btn-primary btn-small') : null}
          {p.status === 'available' ? statusButton('draft', 'Unpublish', 'Hide this guitar from the shop?') : null}
          {p.status === 'available' || p.status === 'reserved' ? statusButton('sold', 'Mark as sold', `Mark the ${name} as SOLD? Any active reservation will be completed. Only do this once the sale is final.`, 'btn btn-dark btn-small') : null}
          {p.status === 'reserved' ? statusButton('available', 'Release reservation', 'Release the current reservation and make the guitar available again?') : null}
          {p.status !== 'archived' && p.status !== 'reserved' ? statusButton('archived', 'Archive', 'Archive this listing? It will be hidden from the shop.') : null}
          {p.status === 'sold' || p.status === 'archived' ? statusButton('available', 'Restore to available', 'Restore this guitar to the shop as available?') : null}
          {p.status === 'archived' ? statusButton('draft', 'Restore as draft', 'Restore this listing as a hidden draft?') : null}
          {p.status === 'draft' ? (
            <form action={deleteDraftProduct}><input type="hidden" name="id" value={p.id} />
              <ConfirmButton className="btn btn-danger btn-small" message="Permanently delete this draft and its photos? This cannot be undone.">Delete draft</ConfirmButton></form>
          ) : null}
        </div>
        {!p.description_approved ? <p className="small" style={{ marginTop: 10 }}>⚠ Tick &quot;I have checked and approve this description&quot; below before publishing.</p> : null}
        {p.status === 'available' && profileHasPerm(profile, 'reservations') ? (
          <details className="disclosure" style={{ marginTop: 12 }}><summary>Reserve manually (e.g. agreed on WhatsApp)</summary><div>
            <form action={staffReserve} className="stack">
              <input type="hidden" name="product_id" value={p.id} />
              <div className="form-grid">
                <div className="field"><label htmlFor="sr-name">Customer name</label><input id="sr-name" name="name" required /></div>
                <div className="field"><label htmlFor="sr-phone">Phone</label><input id="sr-phone" name="phone" /></div>
                <div className="field"><label htmlFor="sr-email">Email</label><input id="sr-email" name="email" type="email" /></div>
                <div className="field"><label htmlFor="sr-hours">Hours</label><input id="sr-hours" name="hours" type="number" min={1} max={336} defaultValue={settings.reservation_hours} /></div>
                <div className="field field-full"><label htmlFor="sr-note">Note</label><input id="sr-note" name="note" /></div>
              </div>
              <div><SubmitButton className="btn btn-dark btn-small">Reserve</SubmitButton></div>
            </form>
          </div></details>
        ) : null}
      </section>

      <section className="card">
        <h2 style={{ fontSize: '1.15rem' }}>Photos ({images.length})</h2>
        {images.length ? (
          <div className="thumb-row" style={{ marginBottom: 14 }}>
            {images.map((img, i) => (
              <figure key={img.id} style={{ width: 150 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(img.thumb_path ?? img.path)!} alt={img.alt || name} style={{ width: 150, height: 150 }} />
                <figcaption className="stack" style={{ gap: 4 }}>
                  {i === 0 ? <span className="badge badge-dark">Main photo</span> : null}
                  <form action={updateImage} className="stack" style={{ gap: 4 }}>
                    <input type="hidden" name="image_id" value={img.id} /><input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="action" value="alt" />
                    <label className="visually-hidden" htmlFor={`alt-${img.id}`}>Photo description (alt text)</label>
                    <input id={`alt-${img.id}`} name="alt" defaultValue={img.alt} placeholder="Describe photo" style={{ minHeight: 32, fontSize: '0.8rem', padding: 4 }} />
                    <button className="link-button small" type="submit">Save description</button>
                  </form>
                  <div className="row" style={{ gap: 6 }}>
                    {i > 0 ? <form action={updateImage}><input type="hidden" name="image_id" value={img.id} /><input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="action" value="first" /><button className="link-button small" type="submit">Make main</button></form> : null}
                    {i > 0 ? <form action={updateImage}><input type="hidden" name="image_id" value={img.id} /><input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="action" value="up" /><button className="link-button small" type="submit" aria-label="Move earlier">←</button></form> : null}
                    {i < images.length - 1 ? <form action={updateImage}><input type="hidden" name="image_id" value={img.id} /><input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="action" value="down" /><button className="link-button small" type="submit" aria-label="Move later">→</button></form> : null}
                    <form action={updateImage}><input type="hidden" name="image_id" value={img.id} /><input type="hidden" name="product_id" value={p.id} /><input type="hidden" name="action" value="delete" />
                      <ConfirmButton className="link-button small" message="Delete this photo?">Delete</ConfirmButton></form>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : <p className="muted">No photos yet.</p>}
        <ImageUploader productId={p.id} defaultAlt={name} />
      </section>

      <ProductForm initial={{
        id: p.id, brand: p.brand, model: p.model, category: p.category, condition: p.condition, price: String(p.price),
        description: p.description, defects: p.defects, public_serial: p.public_serial ?? '', provenance: p.provenance,
        accessories: p.accessories, year_made: p.year_made ?? '', is_featured: p.is_featured, is_new_arrival: p.is_new_arrival,
        description_approved: p.description_approved, serial_number: priv?.serial_number ?? '', acquired_from: priv?.acquired_from ?? '',
        acquisition_cost: priv?.acquisition_cost != null ? String(priv.acquisition_cost) : '', internal_notes: priv?.internal_notes ?? '',
      }} />

      <section className="card">
        <h2 style={{ fontSize: '1.15rem' }}>Reservations</h2>
        {reservations?.length ? (
          <div className="table-wrap"><table className="data"><thead><tr><th>Ref</th><th>Customer</th><th>Status</th><th>Until / closed</th></tr></thead>
            <tbody>{reservations.map((r) => <tr key={r.id}><td>{r.ref}</td><td>{r.contact_name}{r.source === 'owner' ? ' (manual)' : ''}</td><td><StatusBadge status={r.status} text={label(RESERVATION_STATUS, r.status)} /></td><td>{formatDateTime(r.expires_at)}</td></tr>)}</tbody>
          </table></div>
        ) : <p className="muted">None.</p>}
        <p><Link href="/admin/reservations">Manage reservations →</Link></p>
      </section>
      <section className="card">
        <h2 style={{ fontSize: '1.15rem' }}>Offers</h2>
        {offers?.length ? (
          <div className="table-wrap"><table className="data"><thead><tr><th>Ref</th><th>From</th><th className="num">Amount</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{offers.map((o) => <tr key={o.id}><td>{o.ref}</td><td>{o.name}</td><td className="num">{formatZAR(o.amount)}</td><td><StatusBadge status={o.status} text={label(OFFER_STATUS, o.status)} /></td><td>{formatDate(o.created_at)}</td></tr>)}</tbody>
          </table></div>
        ) : <p className="muted">None.</p>}
        <p><Link href="/admin/offers">Manage offers →</Link></p>
      </section>
      {profileHasPerm(profile, 'payments') ? <PaymentsPanel entityType="product" entityId={p.id} back={`/admin/products/${p.id}`} expected={Number(p.price)} /> : null}
    </>
  );
}
