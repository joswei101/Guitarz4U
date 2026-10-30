'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUser, getProfile } from '@/lib/auth';
import { readCart, writeCart } from '@/lib/cart';
import { guardSubmission } from '@/lib/guard';
import { notifyCustomer, notifyStaff } from '@/lib/notify';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, formatZAR } from '@/lib/format';
import { type ActionState, formValues, friendlyDbError, invalid } from '@/lib/action-state';
import {
  enquirySchema, offerSchema, questionSchema, reservationSchema, reviewSchema, stockAlertSchema,
} from '@/lib/validation';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Enquiry cart
// ---------------------------------------------------------------------------
export async function addToCart(formData: FormData) {
  const id = String(formData.get('product_id') ?? '');
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { data: p } = await supabase.from('products').select('status, slug').eq('id', id).maybeSingle();
  if (!p || !['available', 'reserved'].includes(p.status)) {
    redirect(`/cart?error=${encodeURIComponent('That guitar is no longer available.')}`);
  }
  const cart = await readCart();
  if (cart.length >= 10 && !cart.includes(id)) {
    redirect(`/cart?error=${encodeURIComponent('Your enquiry cart can hold up to 10 guitars.')}`);
  }
  await writeCart([...cart, id]);
  revalidatePath('/', 'layout');
  redirect('/cart?ok=' + encodeURIComponent('Added to your enquiry cart.'));
}

export async function removeFromCart(formData: FormData) {
  const id = String(formData.get('product_id') ?? '');
  const cart = await readCart();
  await writeCart(cart.filter((c) => c !== id));
  revalidatePath('/', 'layout');
  redirect('/cart');
}

/** Purchase enquiry — NOT a payment. Availability is re-checked by the database. */
export async function submitEnquiry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guardSubmission(formData, 'enquiry', { max: 5, windowSeconds: 3600 });
  if (blocked) return { error: blocked, values: formValues(formData) };

  const parsed = enquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const v = parsed.data;
  const cart = await readCart();
  if (!cart.length) return { error: 'Your enquiry cart is empty.' };

  const user = await getUser();
  const admin = createAdminClient();
  const { data: enq, error } = await admin.rpc('submit_enquiry', {
    p_user_id: user?.id ?? null as unknown as string,
    p_name: v.name,
    p_email: v.email,
    p_phone: v.phone ?? '',
    p_preferred_contact: v.preferred_contact,
    p_message: v.message ?? '',
    p_product_ids: cart,
  });
  if (error || !enq) return { error: friendlyDbError(error), values: formValues(formData) };

  const { data: items } = await admin.from('enquiry_items').select('product_label, price_at_enquiry').eq('enquiry_id', enq.id);
  const list = (items ?? []).map((i) => `• ${i.product_label} — ${formatZAR(i.price_at_enquiry)}`).join('\n');

  await writeCart([]);
  await notifyStaff({
    perm: 'enquiries',
    title: `New purchase enquiry ${enq.ref} from ${v.name}`,
    body: `${v.name} (${v.email}${v.phone ? ', ' + v.phone : ''}) enquired about:\n${list}\n\nPreferred contact: ${v.preferred_contact}\n${v.message ? 'Message: ' + v.message : ''}`,
    link: `/admin/enquiries/${enq.id}`,
    dedupeKey: `enquiry:${enq.id}`,
  });
  await notifyCustomer({
    userId: user?.id,
    email: v.email,
    title: `We received your enquiry ${enq.ref}`,
    body: `Thank you for your enquiry about:\n${list}\n\nThe owner will contact you by ${v.preferred_contact} to discuss the guitar(s), payment and collection.\n\nImportant: this enquiry is not a payment and the sale is not final yet. Please do not pay until the owner has confirmed the details with you directly.`,
    link: '/account/enquiries',
    dedupeKey: `enquiry-received:${enq.id}`,
    relatedType: 'enquiry',
    relatedId: enq.id,
  });
  revalidatePath('/', 'layout');
  // The cart is now empty, so show the confirmation on a fresh page.
  redirect(`/cart?sent=${encodeURIComponent(enq.ref)}`);
}

// ---------------------------------------------------------------------------
// Reservations (signed-in customers only)
// ---------------------------------------------------------------------------
export async function reserveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: 'Please sign in to reserve a guitar.' };
  const blocked = await guardSubmission(formData, 'reserve', { max: 10, windowSeconds: 3600 });
  if (blocked) return { error: blocked };

  const parsed = reservationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const v = parsed.data;

  const admin = createAdminClient();
  const { data: res, error } = await admin.rpc('reserve_product', {
    p_product_id: v.product_id,
    p_user_id: user.id,
    p_name: v.name,
    p_email: user.email ?? '',
    p_phone: v.phone,
    p_message: v.message ?? '',
  });
  // Only report success once the database has actually saved the reservation.
  if (error || !res) return { error: friendlyDbError(error, 'The reservation could not be made. Please try again.'), values: formValues(formData) };

  const { data: product } = await admin.from('products').select('brand, model, ref, price, slug').eq('id', v.product_id).single();
  const name = product ? `${product.brand} ${product.model} (${product.ref})` : 'your guitar';
  const until = formatDateTime(res.expires_at);

  await notifyStaff({
    perm: 'reservations',
    title: `New reservation ${res.ref}: ${name}`,
    body: `${v.name} (${user.email}, ${v.phone}) reserved ${name} until ${until}.\n${v.message ? 'Message: ' + v.message : ''}\n\nContact them to arrange payment and collection.`,
    link: '/admin/reservations',
    dedupeKey: `reservation:${res.id}`,
  });
  await notifyCustomer({
    userId: user.id,
    email: user.email,
    title: `Reservation ${res.ref} confirmed until ${until}`,
    body: `${name} is reserved for you until ${until}.\n\nThe owner will contact you to arrange payment (usually EFT) and collection in Sandringham, Johannesburg. A reservation is not a payment, and the sale is only final once payment has been confirmed by the owner. If the reservation period ends without the sale being completed, the guitar becomes available again.`,
    link: '/account/reservations',
    dedupeKey: `reservation-confirmed:${res.id}`,
    relatedType: 'reservation',
    relatedId: res.id,
  });
  revalidatePath('/', 'layout');
  return {
    ok: true,
    message: `Reserved! ${name} is held for you until ${until}. We've sent a confirmation and the owner will contact you about payment and collection.`,
    data: { ref: res.ref, expires_at: res.expires_at },
  };
}

export async function cancelMyReservation(formData: FormData) {
  const id = String(formData.get('reservation_id') ?? '');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('customer_cancel_reservation', { p_reservation_id: id });
  if (error || !data) redirect('/account/reservations?error=' + encodeURIComponent(friendlyDbError(error)));
  await notifyStaff({
    perm: 'reservations',
    title: `Reservation ${data.ref} cancelled by customer`,
    body: `${data.contact_name} cancelled reservation ${data.ref}. The guitar is available again.`,
    link: '/admin/reservations',
    dedupeKey: `reservation-cancelled:${data.id}`,
    email: false,
  });
  revalidatePath('/', 'layout');
  redirect('/account/reservations?ok=' + encodeURIComponent('Reservation cancelled. The guitar has been released.'));
}

// ---------------------------------------------------------------------------
// Offers and questions
// ---------------------------------------------------------------------------
export async function submitOffer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guardSubmission(formData, 'offer', { max: 6, windowSeconds: 3600 });
  if (blocked) return { error: blocked, values: formValues(formData) };
  const parsed = offerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const v = parsed.data;

  const admin = createAdminClient();
  const { data: product } = await admin.from('products').select('id, brand, model, ref, price, status').eq('id', v.product_id).maybeSingle();
  if (!product || !['available', 'reserved'].includes(product.status)) {
    return { error: 'Sorry, this guitar is no longer available for offers.' };
  }
  const user = await getUser();
  const { data: offer, error } = await admin.from('offers').insert({
    product_id: v.product_id, user_id: user?.id ?? null, name: v.name, email: v.email, phone: v.phone,
    amount: v.amount, message: v.message ?? '',
  }).select('id, ref').single();
  if (error || !offer) return { error: friendlyDbError(error), values: formValues(formData) };

  const name = `${product.brand} ${product.model} (${product.ref})`;
  await notifyStaff({
    perm: 'enquiries',
    title: `New offer ${offer.ref}: ${formatZAR(v.amount)} for ${name}`,
    body: `${v.name} (${v.email}${v.phone ? ', ' + v.phone : ''}) offered ${formatZAR(v.amount)} for ${name} (listed at ${formatZAR(product.price)}).\n${v.message ? 'Message: ' + v.message : ''}`,
    link: '/admin/offers',
    dedupeKey: `offer:${offer.id}`,
  });
  await notifyCustomer({
    userId: user?.id, email: v.email,
    title: `Offer ${offer.ref} received`,
    body: `We received your offer of ${formatZAR(v.amount)} for ${name}. Offers are reviewed personally by the owner and are not accepted automatically. We'll reply by WhatsApp or email.`,
    link: '/account/enquiries', dedupeKey: `offer-received:${offer.id}`, relatedType: 'offer', relatedId: offer.id,
  });
  return { ok: true, message: `Thanks — your offer ${offer.ref} of ${formatZAR(v.amount)} has been sent. Offers are not accepted automatically; the owner will reply by WhatsApp or email.` };
}

export async function sendMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guardSubmission(formData, 'message', { max: 6, windowSeconds: 3600 });
  if (blocked) return { error: blocked, values: formValues(formData) };
  const parsed = questionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const v = parsed.data;
  const user = await getUser();
  const admin = createAdminClient();

  let productName = '';
  if (v.product_id) {
    const { data: p } = await admin.from('products').select('brand, model, ref, status').eq('id', v.product_id).maybeSingle();
    if (!p || !['available', 'reserved', 'sold'].includes(p.status)) return { error: 'Product not found.' };
    productName = `${p.brand} ${p.model} (${p.ref})`;
  }
  const { data: msg, error } = await admin.from('messages').insert({
    kind: v.product_id ? 'product-question' : 'contact',
    product_id: v.product_id ?? null,
    user_id: user?.id ?? null,
    name: v.name, email: v.email, phone: v.phone,
    subject: v.subject ?? (productName ? `Question about ${productName}` : 'Website message'),
    body: v.body,
  }).select('id').single();
  if (error || !msg) return { error: friendlyDbError(error), values: formValues(formData) };

  await notifyStaff({
    perm: 'enquiries',
    title: productName ? `Question about ${productName}` : `New message from ${v.name}`,
    body: `${v.name} (${v.email}${v.phone ? ', ' + v.phone : ''}) wrote:\n\n${v.body}`,
    link: '/admin/messages',
    dedupeKey: `message:${msg.id}`,
  });
  return { ok: true, message: 'Thank you — your message has been sent. We will reply by email or WhatsApp.' };
}

// ---------------------------------------------------------------------------
// Notify-me stock alerts
// ---------------------------------------------------------------------------
export async function subscribeStockAlert(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guardSubmission(formData, 'alert', { max: 5, windowSeconds: 3600 });
  if (blocked) return { error: blocked, values: formValues(formData) };
  const parsed = stockAlertSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const v = parsed.data;
  const user = await getUser();
  const admin = createAdminClient();
  const { count } = await admin.from('stock_alerts').select('id', { count: 'exact', head: true })
    .eq('email', v.email).eq('is_active', true);
  if ((count ?? 0) >= 5) return { error: 'You already have 5 active alerts for this email address.' };
  const { error } = await admin.from('stock_alerts').insert({
    user_id: user?.id ?? null, email: v.email, category: v.category ?? null, brand: v.brand,
    max_price: v.max_price, keywords: v.keywords,
  });
  if (error) return { error: friendlyDbError(error), values: formValues(formData) };
  return { ok: true, message: "Done! We'll email you when a matching guitar is listed. Each email has a one-click unsubscribe link." };
}

// ---------------------------------------------------------------------------
// Wishlist (signed-in; protected by row-level security)
// ---------------------------------------------------------------------------
export async function toggleWishlist(formData: FormData) {
  const id = String(formData.get('product_id') ?? '');
  const back = String(formData.get('back') ?? '/account/wishlist');
  const safeBack = back.startsWith('/') && !back.startsWith('//') ? back : '/account/wishlist';
  const user = await getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(safeBack)}`);
  if (!UUID.test(id)) redirect(safeBack);
  const supabase = await createClient();
  const { data: existing } = await supabase.from('wishlist_items').select('product_id')
    .eq('user_id', user.id).eq('product_id', id).maybeSingle();
  if (existing) {
    await supabase.from('wishlist_items').delete().eq('user_id', user.id).eq('product_id', id);
  } else {
    const { error } = await supabase.from('wishlist_items').insert({ user_id: user.id, product_id: id });
    if (error) redirect(`${safeBack}${safeBack.includes('?') ? '&' : '?'}error=${encodeURIComponent('Could not update your wishlist.')}`);
  }
  revalidatePath(safeBack.split('?')[0]);
  redirect(safeBack);
}

// ---------------------------------------------------------------------------
// Reviews (registered customers; moderated before publication)
// ---------------------------------------------------------------------------
export async function submitReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getUser();
  if (!user) return { error: 'Please sign in to write a review.' };
  const profile = await getProfile();
  if (profile?.is_blocked) return { error: 'Your account cannot submit reviews.' };
  const blocked = await guardSubmission(formData, 'review', { max: 3, windowSeconds: 86400 });
  if (blocked) return { error: blocked, values: formValues(formData) };
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const v = parsed.data;
  if (/https?:\/\/|www\./i.test(v.body)) {
    return { error: 'Please remove links from your review.', values: formValues(formData) };
  }
  const admin = createAdminClient();
  const { count } = await admin.from('reviews').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('status', 'pending');
  if ((count ?? 0) >= 1) return { error: 'You already have a review awaiting moderation. Thank you for your patience!' };
  const { data: review, error } = await admin.from('reviews').insert({
    user_id: user.id, display_name: v.display_name, rating: v.rating, title: v.title ?? '',
    body: v.body, related_to: v.related_to,
  }).select('id').single();
  if (error || !review) return { error: friendlyDbError(error), values: formValues(formData) };
  await notifyStaff({
    perm: 'reviews', title: `New review awaiting moderation (${v.rating}★)`,
    body: `${v.display_name} wrote: ${v.title ?? ''}\n\n${v.body}`, link: '/admin/reviews',
    dedupeKey: `review:${review.id}`,
  });
  return { ok: true, message: 'Thank you! Your review has been submitted and will appear once the owner has approved it.' };
}

// ---------------------------------------------------------------------------
// Unsubscribe from a stock alert using its private token.
// ---------------------------------------------------------------------------
export async function unsubscribeAlert(formData: FormData) {
  const token = String(formData.get('token') ?? '');
  if (!UUID.test(token)) redirect('/');
  const admin = createAdminClient();
  await admin.from('stock_alerts').update({ is_active: false }).eq('unsubscribe_token', token);
  redirect('/alerts/unsubscribe/' + token + '?done=1');
}
