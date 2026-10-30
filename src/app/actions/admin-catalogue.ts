'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { notifyCustomer, sendEmail } from '@/lib/notify';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/env';
import { formatDateTime, formatZAR, slugify } from '@/lib/format';
import { CATEGORY_SINGULAR, CONDITIONS, label, type Category } from '@/lib/labels';
import { type ActionState, friendlyDbError, invalid } from '@/lib/action-state';
import { productSchema } from '@/lib/validation';

const go = (path: string, kind: 'ok' | 'error', msg: string): never =>
  redirect(`${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(msg)}`);
const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

function splitProduct(v: ReturnType<typeof productSchema.parse>) {
  const { serial_number, acquired_from, acquisition_cost, internal_notes, ...pub } = v;
  return { pub, priv: { serial_number, acquired_from, acquisition_cost, internal_notes } };
}

export async function createProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireStaff('inventory');
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const { pub, priv } = splitProduct(parsed.data);
  const supabase = await createClient();
  const slug = `${slugify(`${pub.brand} ${pub.model}`) || 'guitar'}-${randomBytes(3).toString('hex')}`;
  const { data, error } = await supabase.from('products')
    .insert({ ...pub, slug, status: 'draft', created_by: user.id }).select('id').single();
  if (error || !data) return { error: friendlyDbError(error), values: Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)])) };
  await supabase.from('product_private').insert({ product_id: data.id, ...priv });
  redirect(`/admin/products/${data.id}?ok=${encodeURIComponent('Draft saved. Add photos, then publish when ready.')}`);
}

export async function updateProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff('inventory');
  const id = s(formData, 'id');
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const { pub, priv } = splitProduct(parsed.data);
  const supabase = await createClient();
  const { error } = await supabase.from('products').update(pub).eq('id', id);
  if (error) return { error: friendlyDbError(error) };
  await supabase.from('product_private').upsert({ product_id: id, ...priv });
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Changes saved.' };
}

export async function setProductStatus(formData: FormData) {
  await requireStaff('inventory');
  const id = s(formData, 'id');
  const status = s(formData, 'status');
  const back = `/admin/products/${id}`;
  const supabase = await createClient();
  const { data: before } = await supabase.from('products').select('published_at, status').eq('id', id).single();
  const { data: active } = await supabase.from('reservations').select('id, ref, user_id, contact_email, contact_name').eq('product_id', id).eq('status', 'active').maybeSingle();
  const { data: p, error } = await supabase.rpc('staff_set_product_status', { p_product_id: id, p_status: status, p_note: s(formData, 'note') });
  if (error || !p) go(back, 'error', friendlyDbError(error));

  // Tell a customer whose reservation was released (not when it became a sale).
  if (active && status !== 'sold' && (active.user_id || active.contact_email)) {
    await notifyCustomer({
      userId: active.user_id, email: active.contact_email,
      title: `Reservation ${active.ref} has ended`,
      body: `Your reservation ${active.ref} for the ${p!.brand} ${p!.model} has been released by the owner. If you think this is a mistake, please contact us on WhatsApp.`,
      link: '/account/reservations', dedupeKey: `reservation-released:${active.id}`,
    });
  }
  let alerts = 0;
  if (status === 'available' && !before?.published_at) alerts = await sendStockAlerts(id);
  revalidatePath('/', 'layout');
  const msg = { available: 'Published — the guitar is now visible in the shop.', draft: 'Unpublished (hidden from the shop).', sold: 'Marked as sold.', archived: 'Archived (hidden).' }[status] ?? 'Status updated.';
  go(back, 'ok', msg + (alerts ? ` ${alerts} stock alert email(s) sent.` : ''));
}

/** Emails customers whose "notify me" alerts match a newly published guitar. */
async function sendStockAlerts(productId: string) {
  const admin = createAdminClient();
  const { data: p } = await admin.from('products').select('*').eq('id', productId).single();
  if (!p) return 0;
  const { data: alerts } = await admin.from('stock_alerts').select('*').eq('is_active', true).limit(500);
  const userIds = [...new Set((alerts ?? []).map((a) => a.user_id).filter(Boolean) as string[])];
  const { data: optedOut } = userIds.length
    ? await admin.from('profiles').select('id').in('id', userIds).eq('notify_stock_alerts', false)
    : { data: [] as { id: string }[] };
  const blocked = new Set((optedOut ?? []).map((o) => o.id));
  const text = `${p.brand} ${p.model} ${p.description}`.toLowerCase();
  const matches = (alerts ?? []).filter((a) => {
    if (a.user_id && blocked.has(a.user_id)) return false;
    if (a.category && a.category !== p.category) return false;
    if (a.brand && a.brand.toLowerCase().trim() !== p.brand.toLowerCase().trim()) return false;
    if (a.max_price && Number(p.price) > Number(a.max_price)) return false;
    if (a.keywords && !a.keywords.toLowerCase().split(/\s+/).filter(Boolean).every((w) => text.includes(w))) return false;
    return true;
  }).slice(0, 150); // stays well within free email limits
  let sent = 0;
  for (const a of matches) {
    const r = await sendEmail({
      to: a.email,
      subject: `New at Guitarz4U: ${p.brand} ${p.model} — ${formatZAR(p.price)}`,
      text: `A guitar matching your alert has just been listed:\n\n${p.brand} ${p.model}\n${CATEGORY_SINGULAR[p.category as Category]} · ${label(CONDITIONS, p.condition)} condition · ${formatZAR(p.price)}\n\nView it: ${SITE_URL}/shop/${p.slug}\n\nNo online payment — reserve or enquire on the website, or reply on WhatsApp.\n\nUnsubscribe from this alert: ${SITE_URL}/alerts/unsubscribe/${a.unsubscribe_token}`,
      dedupeKey: `alert:${a.id}:${productId}`,
      relatedType: 'stock_alert', relatedId: a.id,
    });
    if (r === 'sent') sent++;
  }
  return sent;
}

export async function deleteDraftProduct(formData: FormData) {
  await requireStaff('inventory');
  const id = s(formData, 'id');
  const supabase = await createClient();
  const { data: imgs } = await supabase.from('product_images').select('path, thumb_path').eq('product_id', id);
  const { error } = await supabase.from('products').delete().eq('id', id).eq('status', 'draft');
  if (error) go(`/admin/products/${id}`, 'error', 'Only drafts with no history can be deleted. Archive it instead.');
  const paths = (imgs ?? []).flatMap((i) => [i.path, i.thumb_path].filter(Boolean) as string[]);
  if (paths.length) await supabase.storage.from('product-images').remove(paths);
  go('/admin/products', 'ok', 'Draft deleted.');
}

// ---------------------------------------------------------------------------
// Product images (uploaded from the browser to the public product-images bucket)
// ---------------------------------------------------------------------------
export async function addProductImage(input: { productId: string; path: string; thumbPath: string; width: number; height: number; alt: string }) {
  await requireStaff('inventory');
  const prefix = `${input.productId}/`;
  if (!input.path.startsWith(prefix) || !input.thumbPath.startsWith(prefix)) return { error: 'Invalid image path.' };
  const supabase = await createClient();
  const { count } = await supabase.from('product_images').select('id', { count: 'exact', head: true }).eq('product_id', input.productId);
  if ((count ?? 0) >= 20) return { error: 'A listing can have up to 20 photos.' };
  const { error } = await supabase.from('product_images').insert({
    product_id: input.productId, path: input.path, thumb_path: input.thumbPath,
    width: Math.round(input.width) || null, height: Math.round(input.height) || null,
    alt: input.alt.slice(0, 200), sort_order: (count ?? 0) * 10,
  });
  if (error) return { error: friendlyDbError(error) };
  revalidatePath(`/admin/products/${input.productId}`);
  return { ok: true };
}

export async function updateImage(formData: FormData) {
  await requireStaff('inventory');
  const id = s(formData, 'image_id');
  const productId = s(formData, 'product_id');
  const action = s(formData, 'action');
  const supabase = await createClient();
  const { data: images } = await supabase.from('product_images').select('id, sort_order, path, thumb_path').eq('product_id', productId).order('sort_order');
  const list = images ?? [];
  const idx = list.findIndex((i) => i.id === id);
  if (idx < 0) go(`/admin/products/${productId}`, 'error', 'Image not found.');
  if (action === 'alt') {
    await supabase.from('product_images').update({ alt: s(formData, 'alt').slice(0, 200) }).eq('id', id);
  } else if (action === 'up' || action === 'down' || action === 'first') {
    const order = [...list];
    const [item] = order.splice(idx, 1);
    const to = action === 'first' ? 0 : action === 'up' ? Math.max(0, idx - 1) : Math.min(order.length, idx + 1);
    order.splice(to, 0, item);
    await Promise.all(order.map((img, n) => supabase.from('product_images').update({ sort_order: n * 10 }).eq('id', img.id)));
  } else if (action === 'delete') {
    const img = list[idx];
    await supabase.from('product_images').delete().eq('id', id);
    await supabase.storage.from('product-images').remove([img.path, img.thumb_path].filter(Boolean) as string[]);
  }
  revalidatePath('/', 'layout');
  go(`/admin/products/${productId}`, 'ok', action === 'delete' ? 'Photo deleted.' : 'Photos updated.');
}

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------
export async function staffReserve(formData: FormData) {
  await requireStaff('reservations');
  const productId = s(formData, 'product_id');
  const supabase = await createClient();
  const { error } = await supabase.rpc('staff_reserve_product', {
    p_product_id: productId, p_name: s(formData, 'name') || 'Reserved by owner', p_email: s(formData, 'email'),
    p_phone: s(formData, 'phone'), p_hours: Number(s(formData, 'hours') || 48), p_note: s(formData, 'note'),
  });
  if (error) go(`/admin/products/${productId}`, 'error', friendlyDbError(error));
  revalidatePath('/', 'layout');
  go(`/admin/products/${productId}`, 'ok', 'Guitar reserved.');
}

export async function reservationAction(formData: FormData) {
  await requireStaff('reservations');
  const id = s(formData, 'reservation_id');
  const action = s(formData, 'action');
  const back = s(formData, 'back') || '/admin/reservations';
  const supabase = await createClient();
  const { data: r, error } = await supabase.rpc('staff_reservation_action', {
    p_reservation_id: id, p_action: action, p_hours: Number(s(formData, 'hours') || 0) || undefined, p_note: s(formData, 'note'),
  });
  if (error || !r) go(back, 'error', friendlyDbError(error));
  const { data: p } = await supabase.from('products').select('brand, model').eq('id', r!.product_id).single();
  const name = p ? `${p.brand} ${p.model}` : 'your guitar';
  if (formData.get('notify') === 'on' && (r!.user_id || r!.contact_email)) {
    const body = action === 'extend'
      ? `Your reservation ${r!.ref} for the ${name} has been extended until ${formatDateTime(r!.expires_at)}.`
      : action === 'cancel'
        ? `Your reservation ${r!.ref} for the ${name} has been cancelled by the owner.${s(formData, 'note') ? ' Note: ' + s(formData, 'note') : ''}`
        : `Thank you! Your purchase of the ${name} is complete (reservation ${r!.ref}).`;
    await notifyCustomer({
      userId: r!.user_id, email: r!.contact_email, title: `Reservation ${r!.ref} update`, body,
      link: '/account/reservations', dedupeKey: `reservation-${action}:${r!.id}:${r!.updated_at}`,
    });
  }
  revalidatePath('/', 'layout');
  go(back, 'ok', { extend: 'Reservation extended.', cancel: 'Reservation cancelled and guitar released.', convert: 'Reservation completed and guitar marked as sold.' }[action] ?? 'Updated.');
}
