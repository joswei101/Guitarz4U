'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { notifyCustomer, retryEmail, sendEmail } from '@/lib/notify';
import { createClient } from '@/lib/supabase/server';
import { PERMISSIONS } from '@/lib/labels';
import { type ActionState, friendlyDbError, invalid } from '@/lib/action-state';
import { emailField } from '@/lib/validation';

const go = (path: string, kind: 'ok' | 'error', msg: string): never =>
  redirect(`${path}${path.includes('?') ? '&' : '?'}${kind}=${encodeURIComponent(msg)}`);
const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export async function moderateReview(formData: FormData) {
  const { user } = await requireStaff('reviews');
  const status = s(formData, 'status');
  if (!['approved', 'rejected', 'removed', 'pending'].includes(status)) go('/admin/reviews', 'error', 'Unknown action.');
  const supabase = await createClient();
  const { data, error } = await supabase.from('reviews').update({
    status, moderation_note: s(formData, 'note').slice(0, 500), moderated_by: user.id, moderated_at: new Date().toISOString(),
  }).eq('id', s(formData, 'id')).select('id, user_id').single();
  if (error || !data) go('/admin/reviews', 'error', friendlyDbError(error));
  if (status === 'approved' && data!.user_id) {
    await notifyCustomer({ userId: data!.user_id, title: 'Your review has been published', body: 'Thank you — your review is now live on the Guitarz4U website.', link: '/reviews', dedupeKey: `review-approved:${data!.id}` });
  }
  revalidatePath('/', 'layout');
  go('/admin/reviews', 'ok', `Review ${status}.`);
}

// ---------------------------------------------------------------------------
// Website content and FAQs
// ---------------------------------------------------------------------------
export async function saveContent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireStaff('content');
  const parsed = z.object({
    key: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(2).max(160),
    body: z.string().max(60000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const supabase = await createClient();
  const { data: row } = await supabase.from('site_content').select('is_legal').eq('key', parsed.data.key).single();
  const update: { title: string; body: string; updated_by: string; is_draft?: boolean } = { title: parsed.data.title, body: parsed.data.body, updated_by: user.id };
  if (row?.is_legal) update.is_draft = formData.get('reviewed') !== 'on';
  const { error } = await supabase.from('site_content').update(update).eq('key', parsed.data.key);
  if (error) return { error: friendlyDbError(error) };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved. The change is live on the website.' };
}

export async function saveFaq(formData: FormData) {
  await requireStaff('content');
  const id = s(formData, 'id');
  const row = {
    question: s(formData, 'question').slice(0, 300),
    answer: s(formData, 'answer').slice(0, 4000),
    sort_order: Number(s(formData, 'sort_order')) || 0,
    is_published: formData.get('is_published') === 'on',
  };
  if (row.question.length < 3 || !row.answer) go('/admin/faqs', 'error', 'Enter a question and an answer.');
  const supabase = await createClient();
  const { error } = id ? await supabase.from('faqs').update(row).eq('id', id) : await supabase.from('faqs').insert(row);
  if (error) go('/admin/faqs', 'error', friendlyDbError(error));
  revalidatePath('/faq');
  go('/admin/faqs', 'ok', id ? 'FAQ updated.' : 'FAQ added.');
}

export async function deleteFaq(formData: FormData) {
  await requireStaff('content');
  const supabase = await createClient();
  await supabase.from('faqs').delete().eq('id', s(formData, 'id'));
  revalidatePath('/faq');
  go('/admin/faqs', 'ok', 'FAQ deleted.');
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff('settings');
  const schema = z.object({
    contact_email: emailField,
    owner_notification_email: emailField,
    whatsapp_display: z.string().trim().min(9).max(30),
    whatsapp_international: z.string().trim().regex(/^\d{10,15}$/, 'Digits only, starting with the country code, e.g. 27648567019.'),
    social_handle: z.string().trim().max(60),
    collection_area: z.string().trim().min(2).max(120),
    reservation_hours: z.coerce.number().int().min(1).max(336),
    max_active_reservations_per_customer: z.coerce.number().int().min(1).max(10),
    repair_warranty_days: z.string().trim().transform((v) => (v === '' ? null : Number(v)))
      .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 3650), 'Enter a whole number of days (0–3650), or leave empty.'),
    repair_warranty_terms: z.string().trim().max(4000),
    shop_notice: z.string().trim().max(300),
    legal_reviewed: z.string().optional().transform((v) => v === 'on'),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from('settings').update(parsed.data).eq('id', 1);
  if (error) return { error: friendlyDbError(error) };
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Settings saved.' };
}

export async function sendTestEmail() {
  const { user } = await requireStaff('settings');
  const supabase = await createClient();
  const { data } = await supabase.from('settings').select('owner_notification_email').eq('id', 1).single();
  const to = data?.owner_notification_email ?? user.email!;
  const result = await sendEmail({ to, subject: 'Guitarz4U test email', text: 'This is a test email from your Guitarz4U website. If you can read this, email notifications are working.' });
  const msg = { sent: `Test email sent to ${to}. Check your inbox (and spam folder).`, skipped: 'Email is not configured yet (SMTP settings missing). See the setup guide, Phase F.', failed: 'The email could not be sent — see the email log below for the error.', duplicate: 'Already sent.' }[result];
  go('/admin/notifications', result === 'sent' ? 'ok' : 'error', msg);
}

export async function retryFailedEmail(formData: FormData) {
  await requireStaff('settings');
  const result = await retryEmail(s(formData, 'id'));
  go('/admin/notifications', result === 'sent' ? 'ok' : 'error', result === 'sent' ? 'Email sent.' : `Email not sent (${result}).`);
}

export async function markStaffNotificationsRead() {
  await requireStaff();
  const supabase = await createClient();
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('audience', 'staff').is('read_at', null);
  revalidatePath('/admin', 'layout');
  go('/admin/notifications', 'ok', 'All marked as read.');
}

// ---------------------------------------------------------------------------
// Customer accounts and staff access (owner only — enforced in the database)
// ---------------------------------------------------------------------------
export async function setAccess(formData: FormData) {
  await requireStaff('customers');
  const id = s(formData, 'id');
  const perms = formData.getAll('permissions').map(String).filter((p) => p in PERMISSIONS);
  const supabase = await createClient();
  const { error } = await supabase.rpc('owner_set_access', {
    p_user_id: id, p_role: s(formData, 'role'), p_permissions: perms, p_blocked: formData.get('is_blocked') === 'on',
  });
  if (error) go(`/admin/customers/${id}`, 'error', friendlyDbError(error));
  go(`/admin/customers/${id}`, 'ok', 'Access updated.');
}
