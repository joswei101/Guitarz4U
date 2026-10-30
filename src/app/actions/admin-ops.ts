'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { notifyCustomer } from '@/lib/notify';
import { createClient } from '@/lib/supabase/server';
import { formatZAR } from '@/lib/format';
import { ENQUIRY_STATUS, OFFER_STATUS, REPAIR_STATUS, SELLER_STATUS, label, type Permission } from '@/lib/labels';
import { friendlyDbError } from '@/lib/action-state';

const go = (path: string, kind: 'ok' | 'error', msg: string): never =>
  redirect(`${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(msg)}`);
const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const safeBack = (b: string, fallback: string) => (b.startsWith('/admin') ? b : fallback);

const ENTITY: Record<string, { perm: Permission; labels: Record<string, string>; noun: string; link: (id: string) => string }> = {
  enquiries: { perm: 'enquiries', labels: ENQUIRY_STATUS, noun: 'enquiry', link: () => '/account/enquiries' },
  offers: { perm: 'enquiries', labels: OFFER_STATUS, noun: 'offer', link: () => '/account/enquiries' },
  seller_enquiries: { perm: 'sellers', labels: SELLER_STATUS, noun: 'guitar submission', link: (id) => `/account/selling/${id}` },
  repairs: { perm: 'repairs', labels: REPAIR_STATUS, noun: 'repair', link: (id) => `/account/repairs/${id}` },
};

const EXTRA: Record<string, string> = {
  'awaiting-inspection': 'We would like to inspect your guitar in person. We will contact you privately to arrange a time.',
  'handover-arranged': 'Handover has been arranged — details have been shared with you privately.',
  'repair-in-progress': 'Work on your guitar has started.',
  'awaiting-parts': 'We are waiting for parts to arrive. We will update you as soon as they do.',
  'repair-completed': 'Your repair is complete.',
  'ready-for-collection': 'Your guitar is ready for collection. We will contact you privately to arrange collection and payment (usually EFT).',
  collected: 'Thank you for collecting your guitar!',
  contacted: 'The owner has been in touch about your enquiry.',
  agreed: 'The sale has been agreed. Payment and collection are arranged privately with the owner.',
};

/** Change the status of an enquiry, offer, seller submission or repair. */
export async function setRecordStatus(formData: FormData) {
  const entity = s(formData, 'entity');
  const cfg = ENTITY[entity];
  if (!cfg) redirect('/admin');
  await requireStaff(cfg.perm);
  const id = s(formData, 'id');
  const status = s(formData, 'status');
  const note = s(formData, 'note');
  const back = safeBack(s(formData, 'back'), '/admin');
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_status', {
    p_entity: entity, p_id: id, p_status: status, p_note: note, p_visible: formData.get('visible') !== 'off',
  });
  if (error) go(back, 'error', friendlyDbError(error));

  if (formData.get('notify') === 'on') {
    const { data: rec } = await supabase.from(entity as 'repairs').select('*').eq('id', id).single();
    const r = rec as unknown as { ref: string; user_id: string | null; email: string };
    if (r) {
      await notifyCustomer({
        userId: r.user_id, email: r.email,
        title: `Your ${cfg.noun} ${r.ref}: ${label(cfg.labels, status)}`,
        body: [`The status of your ${cfg.noun} ${r.ref} is now: ${label(cfg.labels, status)}.`, EXTRA[status], note && formData.get('visible') !== 'off' ? `Note from the owner: ${note}` : ''].filter(Boolean).join('\n\n'),
        link: r.user_id ? cfg.link(id) : undefined,
        dedupeKey: `${entity}:${id}:status:${status}:${Date.now()}`,
        relatedType: entity, relatedId: id,
      });
    }
  }
  revalidatePath('/', 'layout');
  go(back, 'ok', `Status updated to "${label(cfg.labels, status)}".${formData.get('notify') === 'on' ? ' Customer notified.' : ''}`);
}

/** Save private admin notes and other editable fields. */
export async function saveNotes(formData: FormData) {
  const entity = s(formData, 'entity');
  const back = safeBack(s(formData, 'back'), '/admin');
  const fields: Record<string, { perm: Permission; cols: string[] }> = {
    enquiries: { perm: 'enquiries', cols: ['admin_notes'] },
    offers: { perm: 'enquiries', cols: ['admin_notes', 'counter_amount'] },
    messages: { perm: 'enquiries', cols: ['admin_notes', 'status'] },
    seller_enquiries: { perm: 'sellers', cols: ['admin_notes', 'inspection_notes', 'inspection_date', 'handover_notes'] },
    repairs: { perm: 'repairs', cols: ['admin_notes', 'dropoff_notes'] },
  };
  const cfg = fields[entity];
  if (!cfg) redirect('/admin');
  await requireStaff(cfg.perm);
  const update: Record<string, string | number | null> = {};
  for (const c of cfg.cols) {
    if (!formData.has(c)) continue;
    const v = s(formData, c);
    if (c === 'counter_amount') update[c] = v ? Number(v.replace(/[R\s,]/gi, '')) : null;
    else if (c === 'inspection_date') update[c] = v || null;
    else update[c] = v;
  }
  const supabase = await createClient();
  const { error } = await supabase.from(entity as 'repairs').update(update as never).eq('id', s(formData, 'id'));
  if (error) go(back, 'error', friendlyDbError(error));
  revalidatePath(back);
  go(back, 'ok', 'Saved.');
}

// ---------------------------------------------------------------------------
// Seller negotiations
// ---------------------------------------------------------------------------
export async function recordSellerOffer(formData: FormData) {
  await requireStaff('sellers');
  const id = s(formData, 'id');
  const back = `/admin/sellers/${id}`;
  const direction = s(formData, 'direction');
  const amount = Number(s(formData, 'amount').replace(/[R\s,]/gi, ''));
  const note = s(formData, 'note');
  const supabase = await createClient();
  const { error } = await supabase.rpc('staff_seller_offer', { p_enquiry_id: id, p_direction: direction, p_amount: amount, p_note: note });
  if (error) go(back, 'error', friendlyDbError(error));
  if (direction === 'owner-offer' && formData.get('notify') === 'on') {
    const { data: e } = await supabase.from('seller_enquiries').select('ref, user_id, email, brand, model').eq('id', id).single();
    if (e) {
      await notifyCustomer({
        userId: e.user_id, email: e.email,
        title: `Our offer for your ${e.brand} ${e.model} (${e.ref})`,
        body: `Thank you for letting us inspect your ${e.brand} ${e.model}. Our offer is ${formatZAR(amount)}.${note ? '\n\n' + note : ''}\n\nPlease reply on WhatsApp or email to accept, decline or discuss. This offer is not binding until we have agreed the handover details with you.`,
        link: e.user_id ? `/account/selling/${id}` : undefined,
        dedupeKey: `seller-offer:${id}:${amount}:${Date.now()}`, relatedType: 'seller_enquiry', relatedId: id,
      });
    }
  }
  go(back, 'ok', direction === 'owner-offer' ? 'Offer recorded.' : 'Counter-offer recorded.');
}

export async function decideSellerOffer(formData: FormData) {
  await requireStaff('sellers');
  const id = s(formData, 'id');
  const supabase = await createClient();
  const { error } = await supabase.rpc('staff_seller_offer_decision', {
    p_offer_id: s(formData, 'offer_id'), p_decision: s(formData, 'decision'), p_note: s(formData, 'note'),
  });
  if (error) go(`/admin/sellers/${id}`, 'error', friendlyDbError(error));
  go(`/admin/sellers/${id}`, 'ok', 'Decision recorded.');
}

// ---------------------------------------------------------------------------
// Repairs: quotes, decisions and work log
// ---------------------------------------------------------------------------
export async function sendQuote(formData: FormData) {
  await requireStaff('repairs');
  const id = s(formData, 'id');
  const back = `/admin/repairs/${id}`;
  const labour = Number(s(formData, 'labour').replace(/[R\s,]/gi, ''));
  const parts = Number(s(formData, 'parts').replace(/[R\s,]/gi, '') || 0);
  if (!Number.isFinite(labour) || !Number.isFinite(parts)) go(back, 'error', 'Enter labour and parts amounts in rand.');
  const supabase = await createClient();
  const { data: q, error } = await supabase.rpc('staff_send_quote', {
    p_repair_id: id, p_kind: s(formData, 'kind'), p_labour: labour, p_parts: parts,
    p_parts_detail: s(formData, 'parts_detail'), p_notes: s(formData, 'notes'),
  });
  if (error || !q) go(back, 'error', friendlyDbError(error));
  const { data: r } = await supabase.from('repairs').select('ref, user_id, email, brand, model').eq('id', id).single();
  if (r && formData.get('notify') === 'on') {
    await notifyCustomer({
      userId: r.user_id, email: r.email,
      title: `${q!.kind === 'initial' ? 'Your repair quote' : 'Additional cost needs your approval'} — ${r.ref}`,
      body: `${q!.kind === 'initial' ? 'Here is your quote' : 'We found additional work is needed'} for your ${r.brand} ${r.model}:\n\nLabour: ${formatZAR(q!.labour_amount)}\nParts: ${formatZAR(q!.parts_amount)}${q!.parts_detail ? ' (' + q!.parts_detail + ')' : ''}\nTotal: ${formatZAR(q!.total_amount)}\n${q!.notes ? '\n' + q!.notes + '\n' : ''}\n${r.user_id ? 'Please approve or decline it in your account.' : 'Please reply on WhatsApp or email to approve or decline.'} ${q!.kind === 'initial' ? 'No work will start until you approve.' : 'The extra work will not go ahead until you approve.'}`,
      link: r.user_id ? `/account/repairs/${id}` : undefined,
      dedupeKey: `quote-sent:${q!.id}`, relatedType: 'repair', relatedId: id,
    });
  }
  revalidatePath(back);
  go(back, 'ok', `Quote v${q!.version} sent (${formatZAR(q!.total_amount)}).`);
}

export async function recordQuoteDecision(formData: FormData) {
  await requireStaff('repairs');
  const id = s(formData, 'id');
  const supabase = await createClient();
  const { error } = await supabase.rpc('staff_record_quote_decision', {
    p_quote_id: s(formData, 'quote_id'), p_decision: s(formData, 'decision'),
    p_method: s(formData, 'method'), p_note: s(formData, 'note'),
  });
  if (error) go(`/admin/repairs/${id}`, 'error', friendlyDbError(error));
  go(`/admin/repairs/${id}`, 'ok', 'Customer decision recorded.');
}

export async function addWorkLog(formData: FormData) {
  const { user } = await requireStaff('repairs');
  const id = s(formData, 'id');
  const entry = s(formData, 'entry');
  if (!entry) go(`/admin/repairs/${id}`, 'error', 'Write a note first.');
  const visible = formData.get('visible') === 'on';
  const supabase = await createClient();
  const minutes = Number(s(formData, 'labour_minutes'));
  const { error } = await supabase.from('repair_work_log').insert({
    repair_id: id, entry: entry.slice(0, 4000), parts_used: s(formData, 'parts_used').slice(0, 1000),
    labour_minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null,
    visible_to_customer: visible, created_by: user.id,
  });
  if (error) go(`/admin/repairs/${id}`, 'error', friendlyDbError(error));
  if (visible && formData.get('notify') === 'on') {
    const { data: r } = await supabase.from('repairs').select('ref, user_id, email').eq('id', id).single();
    if (r) await notifyCustomer({ userId: r.user_id, email: r.email, title: `Repair ${r.ref} update`, body: entry, link: r.user_id ? `/account/repairs/${id}` : undefined, dedupeKey: `worklog:${id}:${Date.now()}` });
  }
  go(`/admin/repairs/${id}`, 'ok', 'Work log updated.');
}

// ---------------------------------------------------------------------------
// Manual payment records (no money is processed by the website)
// ---------------------------------------------------------------------------
export async function recordPayment(formData: FormData) {
  const { user } = await requireStaff('payments');
  const back = safeBack(s(formData, 'back'), '/admin/payments');
  if (formData.get('verified') !== 'on') go(back, 'error', 'Only record a payment after you have checked it has actually been received.');
  const amount = Number(s(formData, 'amount').replace(/[R\s,]/gi, ''));
  if (!Number.isFinite(amount) || amount <= 0) go(back, 'error', 'Enter the amount received.');
  const receivedOn = s(formData, 'received_on');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedOn)) go(back, 'error', 'Enter the date the money was received.');
  const supabase = await createClient();
  const { error } = await supabase.from('payments').insert({
    entity_type: s(formData, 'entity_type'), entity_id: s(formData, 'entity_id'), amount, method: s(formData, 'method'),
    reference_note: s(formData, 'reference_note').slice(0, 500), received_on: receivedOn,
    verified_confirmation: true, recorded_by: user.id,
  });
  if (error) go(back, 'error', friendlyDbError(error));
  revalidatePath(back);
  go(back, 'ok', `Payment of ${formatZAR(amount)} recorded.`);
}

export async function voidPayment(formData: FormData) {
  await requireStaff('payments');
  const back = safeBack(s(formData, 'back'), '/admin/payments');
  const reason = s(formData, 'void_reason');
  if (!reason) go(back, 'error', 'Give a reason for voiding the payment record.');
  const supabase = await createClient();
  const { error } = await supabase.from('payments').update({ voided: true, void_reason: reason.slice(0, 500) }).eq('id', s(formData, 'id'));
  if (error) go(back, 'error', friendlyDbError(error));
  go(back, 'ok', 'Payment record voided (kept in history).');
}
