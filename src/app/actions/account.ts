'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { notifyStaff } from '@/lib/notify';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/env';
import { type ActionState, friendlyDbError, invalid } from '@/lib/action-state';
import { emailField, profileSchema } from '@/lib/validation';
import { formatZAR } from '@/lib/format';

const go = (path: string, kind: 'ok' | 'error', msg: string): never =>
  redirect(`${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(msg)}`);

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireUser('/account/profile');
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const supabase = await createClient();
  // Row-level security + column privileges only allow these fields on your own profile.
  const { error } = await supabase.from('profiles').update(parsed.data).eq('id', user.id);
  if (error) return { error: friendlyDbError(error) };
  revalidatePath('/account', 'layout');
  return { ok: true, message: 'Your details have been saved.' };
}

export async function changeEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser('/account/profile');
  const parsed = z.object({ email: emailField }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.email },
    { emailRedirectTo: `${SITE_URL}/auth/callback?next=/account/profile` },
  );
  if (error) return { error: 'Your email address could not be changed. It may already be in use.' };
  return { ok: true, message: 'Check both your old and new inboxes and click the confirmation links to finish changing your email.' };
}

export async function markAllNotificationsRead() {
  const { user } = await requireUser('/account/notifications');
  const supabase = await createClient();
  await supabase.from('notifications').update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id).eq('audience', 'customer').is('read_at', null);
  revalidatePath('/account', 'layout');
  redirect('/account/notifications');
}

/** Customer approves or declines a repair quote from their account. */
export async function decideQuote(formData: FormData) {
  await requireUser('/account/repairs');
  const quoteId = String(formData.get('quote_id') ?? '');
  const repairId = String(formData.get('repair_id') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '').slice(0, 1000);
  const back = `/account/repairs/${repairId}`;
  if (decision === 'approved' && formData.get('confirm') !== 'on') {
    go(back, 'error', 'Please tick the box to confirm you approve the quote.');
  }
  const supabase = await createClient();
  const { data: q, error } = await supabase.rpc('customer_decide_quote', {
    p_quote_id: quoteId, p_decision: decision, p_note: note,
  });
  if (error || !q) go(back, 'error', friendlyDbError(error));
  const { data: r } = await supabase.from('repairs').select('ref, name').eq('id', repairId).single();
  await notifyStaff({
    perm: 'repairs',
    title: `Quote ${decision} on ${r?.ref ?? 'repair'}: ${formatZAR(q!.total_amount)}`,
    body: `${r?.name ?? 'The customer'} ${decision} ${q!.kind} quote v${q!.version} (${formatZAR(q!.total_amount)}) on the website.${note ? '\nNote: ' + note : ''}`,
    link: `/admin/repairs/${repairId}`,
    dedupeKey: `quote-decision:${quoteId}`,
  });
  revalidatePath(back);
  go(back, 'ok', decision === 'approved' ? 'Thank you — quote approved. We will go ahead with the work.' : 'Quote declined. We will contact you to discuss options.');
}

export async function setAlertActive(formData: FormData) {
  await requireUser('/account/alerts');
  const supabase = await createClient();
  await supabase.from('stock_alerts').update({ is_active: formData.get('active') === 'true' })
    .eq('id', String(formData.get('id') ?? ''));
  revalidatePath('/account/alerts');
  redirect('/account/alerts');
}

export async function deleteAlert(formData: FormData) {
  await requireUser('/account/alerts');
  const supabase = await createClient();
  await supabase.from('stock_alerts').delete().eq('id', String(formData.get('id') ?? ''));
  revalidatePath('/account/alerts');
  redirect('/account/alerts?ok=' + encodeURIComponent('Alert deleted.'));
}

/**
 * Deletes the customer's account (POPIA "right to deletion"), while keeping
 * records the business must retain for tax/accounting purposes.
 */
export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireUser('/account/privacy');
  if (String(formData.get('confirm_text') ?? '').trim().toUpperCase() !== 'DELETE') {
    return { error: 'Type DELETE in capital letters to confirm.' };
  }
  const admin = createAdminClient();
  const uid = user.id;

  // 1. Things that must be finished first (the customer's guitar may be with us).
  const [{ count: activeRepairs }, { count: activeRes }, { count: activeSales }] = await Promise.all([
    admin.from('repairs').select('id', { count: 'exact', head: true }).eq('user_id', uid)
      .not('status', 'in', '(request-received,collected,cancelled)'),
    admin.from('reservations').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'active'),
    admin.from('seller_enquiries').select('id', { count: 'exact', head: true }).eq('user_id', uid)
      .in('status', ['offer-accepted', 'handover-arranged']),
  ]);
  if ((activeRepairs ?? 0) > 0 || (activeRes ?? 0) > 0 || (activeSales ?? 0) > 0) {
    return { error: 'You have a repair, reservation or guitar handover in progress. Please contact us to finish it before deleting your account.' };
  }

  // 2. Records linked to recorded payments are retained (unlinked, not anonymised).
  const { data: paid } = await admin.from('payments').select('entity_type, entity_id').eq('customer_id', uid).eq('voided', false);
  const keep = new Set((paid ?? []).map((p) => `${p.entity_type}:${p.entity_id}`));
  const anon = { name: 'Deleted customer', email: 'deleted@invalid.local' };

  const { data: enquiries } = await admin.from('enquiries').select('id, status').eq('user_id', uid);
  for (const e of enquiries ?? []) {
    if (!keep.has(`enquiry:${e.id}`) && e.status !== 'completed') {
      await admin.from('enquiries').update({ ...anon, phone: null, message: '' }).eq('id', e.id);
    }
  }
  const { data: repairs } = await admin.from('repairs').select('id').eq('user_id', uid);
  for (const r of repairs ?? []) {
    if (!keep.has(`repair:${r.id}`)) {
      await admin.from('repairs').update({ ...anon, whatsapp: null }).eq('id', r.id);
      await removeFiles(admin, 'repair', r.id);
    }
  }
  const { data: sellers } = await admin.from('seller_enquiries').select('id, status').eq('user_id', uid);
  for (const s of sellers ?? []) {
    if (s.status !== 'completed') {
      await admin.from('seller_enquiries').update({ ...anon, whatsapp: '000000', suburb: 'Removed', notes: '' }).eq('id', s.id);
      await removeFiles(admin, 'seller', s.id);
    }
  }
  await admin.from('reservations').update({ contact_name: anon.name, contact_email: null, contact_phone: null, message: '' })
    .eq('user_id', uid).neq('status', 'converted');
  await admin.from('offers').update({ ...anon, phone: null, message: '' }).eq('user_id', uid);
  await admin.from('messages').delete().eq('user_id', uid);
  if (user.email) await admin.from('stock_alerts').delete().eq('email', user.email.toLowerCase());

  // 3. Delete the login. Profile, wishlist, notifications, alerts and reviews
  //    are removed automatically; retained records are unlinked (user_id = null).
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) return { error: 'Your account could not be deleted. Please contact us and we will do it for you.' };

  await notifyStaff({
    perm: 'customers', title: 'A customer deleted their account',
    body: 'A customer account was deleted. Retained business records were unlinked; other personal details were removed.',
    link: '/admin/customers', dedupeKey: `account-deleted:${uid}`, email: false,
  });
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/?ok=' + encodeURIComponent('Your account has been deleted.'));
}

async function removeFiles(admin: ReturnType<typeof createAdminClient>, kind: 'seller' | 'repair', id: string) {
  const { data } = await admin.storage.from('submissions').list(`${kind}/${id}`, { limit: 100 });
  if (data?.length) await admin.storage.from('submissions').remove(data.map((o) => `${kind}/${id}/${o.name}`));
  await admin.from('submission_files').delete().eq(kind === 'seller' ? 'seller_enquiry_id' : 'repair_id', id);
}
