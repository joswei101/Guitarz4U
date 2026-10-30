'use server';

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { getUser } from '@/lib/auth';
import { guardSubmission } from '@/lib/guard';
import { notifyCustomer, notifyStaff } from '@/lib/notify';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatZAR } from '@/lib/format';
import { REPAIR_SERVICES, SELLER_CONDITIONS, label } from '@/lib/labels';
import { type ActionState, formValues, friendlyDbError, invalid } from '@/lib/action-state';
import { repairSchema, sellerSchema } from '@/lib/validation';
import { ALLOWED_UPLOADS, MAX_FILES, type UploadMeta, type UploadTarget } from '@/lib/upload-rules';

/*
 * Upload flow for private seller/repair photos and videos:
 *  1. The form is validated and saved here; the server checks each file's
 *     declared type and size against the allow-list.
 *  2. The server creates short-lived signed upload URLs in the PRIVATE
 *     "submissions" bucket (which also enforces type and size limits itself).
 *  3. The browser uploads the files directly to storage.
 *  4. finaliseUploads() checks a signed ticket, confirms which files really
 *     arrived and records them. Only the owner/authorised staff (and the
 *     customer, via short-lived links) can ever view them.
 */

function ticketKey() {
  return createHmac('sha256', process.env.SUPABASE_SECRET_KEY ?? 'dev').update('upload-ticket').digest();
}
function signTicket(payload: object) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', ticketKey()).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function readTicket(ticket: string): { kind: 'seller' | 'repair'; id: string; paths: string[]; exp: number } | null {
  const [body, sig] = ticket.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', ticketKey()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const data = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
  return data;
}

function parseFiles(formData: FormData, allowVideo: boolean): { files: UploadMeta[] } | { error: string } {
  let files: UploadMeta[] = [];
  try {
    files = JSON.parse(String(formData.get('files_meta') || '[]'));
  } catch {
    return { error: 'Could not read the selected files. Please try again.' };
  }
  if (!Array.isArray(files)) return { error: 'Could not read the selected files.' };
  if (files.length > MAX_FILES) return { error: `Please choose at most ${MAX_FILES} files.` };
  for (const f of files) {
    const rule = ALLOWED_UPLOADS[f?.type as keyof typeof ALLOWED_UPLOADS];
    if (!rule || (rule.video && !allowVideo)) return { error: `"${String(f?.name).slice(0, 60)}" is not an allowed file type.` };
    if (typeof f.size !== 'number' || f.size <= 0 || f.size > rule.maxBytes) {
      return { error: `"${String(f.name).slice(0, 60)}" is too large (max ${Math.round(rule.maxBytes / 1048576)} MB).` };
    }
  }
  return { files };
}

async function createTargets(kind: 'seller' | 'repair', id: string, files: UploadMeta[]) {
  const admin = createAdminClient();
  const targets: UploadTarget[] = [];
  for (const f of files) {
    const ext = ALLOWED_UPLOADS[f.type as keyof typeof ALLOWED_UPLOADS].ext;
    const path = `${kind}/${id}/${randomUUID()}.${ext}`;
    const { data, error } = await admin.storage.from('submissions').createSignedUploadUrl(path);
    if (error || !data) throw new Error('Could not prepare the upload.');
    targets.push({ path, token: data.token, type: f.type });
  }
  const ticket = signTicket({ kind, id, paths: targets.map((t) => t.path), exp: Date.now() + 30 * 60 * 1000 });
  return { targets, ticket };
}

/** Called by the browser after uploading. Records only files that really exist. */
export async function finaliseUploads(ticket: string): Promise<{ saved: number; error?: string }> {
  const t = readTicket(ticket);
  if (!t) return { saved: 0, error: 'Upload session expired. Please send the photos by WhatsApp instead.' };
  const admin = createAdminClient();
  const { data: objects } = await admin.storage.from('submissions').list(`${t.kind}/${t.id}`, { limit: 100 });
  const rows = (objects ?? [])
    .map((o) => ({ o, path: `${t.kind}/${t.id}/${o.name}` }))
    .filter(({ path }) => t.paths.includes(path))
    .map(({ o, path }) => ({
      path,
      mime_type: String(o.metadata?.mimetype ?? 'application/octet-stream'),
      size_bytes: Number(o.metadata?.size ?? 1) || 1,
      ...(t.kind === 'seller' ? { seller_enquiry_id: t.id } : { repair_id: t.id }),
    }))
    .filter((r) => r.mime_type in ALLOWED_UPLOADS);
  if (!rows.length) return { saved: 0 };
  const { error } = await admin.from('submission_files').upsert(rows, { onConflict: 'path', ignoreDuplicates: true });
  if (error) return { saved: 0, error: 'Your request was saved, but the files could not be recorded.' };
  return { saved: rows.length };
}

// ---------------------------------------------------------------------------
// Sell or give away a guitar
// ---------------------------------------------------------------------------
export async function submitSellerEnquiry(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guardSubmission(formData, 'seller', { max: 4, windowSeconds: 3600 });
  if (blocked) return { error: blocked, values: formValues(formData) };
  const parsed = sellerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const files = parseFiles(formData, false);
  if ('error' in files) return { error: files.error, values: formValues(formData) };
  const v = parsed.data;
  const user = await getUser();
  const admin = createAdminClient();

  const { data: row, error } = await admin.from('seller_enquiries').insert({
    user_id: user?.id ?? null,
    name: v.name, email: v.email, whatsapp: v.whatsapp, preferred_contact: v.preferred_contact,
    brand: v.brand, model: v.model, category: v.category ?? null, condition: v.condition,
    faults: v.faults ?? '', is_giveaway: v.is_giveaway, asking_price: v.is_giveaway ? null : v.asking_price,
    suburb: v.suburb, accessories: v.accessories ?? '', notes: v.notes ?? '',
  }).select('id, ref').single();
  if (error || !row) return { error: friendlyDbError(error), values: formValues(formData) };

  let upload: { targets: UploadTarget[]; ticket: string } | null = null;
  try {
    if (files.files.length) upload = await createTargets('seller', row.id, files.files);
  } catch {
    upload = null;
  }

  const price = v.is_giveaway ? 'Free giveaway' : v.asking_price ? `Asking ${formatZAR(v.asking_price)}` : 'No asking price given';
  await notifyStaff({
    perm: 'sellers',
    title: `New seller enquiry ${row.ref}: ${v.brand} ${v.model}`,
    body: `${v.name} (${v.email}, WhatsApp ${v.whatsapp}) in ${v.suburb}\nCondition: ${label(SELLER_CONDITIONS, v.condition)}\n${price}\nPhotos: ${files.files.length}\n${v.faults ? 'Faults: ' + v.faults : ''}`,
    link: `/admin/sellers/${row.id}`,
    dedupeKey: `seller:${row.id}`,
  });
  await notifyCustomer({
    userId: user?.id, email: v.email,
    title: `We received your guitar submission ${row.ref}`,
    body: `Thank you for offering your ${v.brand} ${v.model}. We'll review your submission and contact you by ${v.preferred_contact} to arrange an inspection. The owner inspects every guitar in person before making any offer.`,
    link: user ? `/account/selling/${row.id}` : undefined,
    dedupeKey: `seller-received:${row.id}`, relatedType: 'seller_enquiry', relatedId: row.id,
  });

  return {
    ok: true,
    message: `Thank you! Your submission ${row.ref} has been received.${user ? ' You can track it in My account → Selling.' : ''} We'll be in touch to arrange an inspection.`,
    data: upload ? { ticket: upload.ticket, targets: upload.targets } : { uploadFailed: files.files.length > 0 },
  };
}

// ---------------------------------------------------------------------------
// Repair request
// ---------------------------------------------------------------------------
export async function submitRepairRequest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guardSubmission(formData, 'repair', { max: 4, windowSeconds: 3600 });
  if (blocked) return { error: blocked, values: formValues(formData) };
  const raw = { ...Object.fromEntries(formData), services: formData.getAll('services').map(String) };
  const parsed = repairSchema.safeParse(raw);
  if (!parsed.success) return invalid(formData, parsed.error);
  const files = parseFiles(formData, true);
  if ('error' in files) return { error: files.error, values: formValues(formData) };
  const v = parsed.data;
  const user = await getUser();
  const admin = createAdminClient();

  const { data: row, error } = await admin.from('repairs').insert({
    user_id: user?.id ?? null, name: v.name, email: v.email, whatsapp: v.whatsapp,
    preferred_contact: v.preferred_contact, brand: v.brand, model: v.model, problem: v.problem,
    services: v.services, preferred_date: v.preferred_date,
  }).select('id, ref').single();
  if (error || !row) return { error: friendlyDbError(error), values: formValues(formData) };

  let upload: { targets: UploadTarget[]; ticket: string } | null = null;
  try {
    if (files.files.length) upload = await createTargets('repair', row.id, files.files);
  } catch {
    upload = null;
  }

  const services = v.services.map((s) => label(REPAIR_SERVICES, s)).join(', ') || 'Not specified';
  await notifyStaff({
    perm: 'repairs',
    title: `New repair request ${row.ref}: ${v.brand} ${v.model}`,
    body: `${v.name} (${v.email}${v.whatsapp ? ', WhatsApp ' + v.whatsapp : ''})\nServices: ${services}\nPreferred date: ${v.preferred_date ?? 'Not specified'}\nFiles: ${files.files.length}\n\nProblem: ${v.problem}`,
    link: `/admin/repairs/${row.id}`,
    dedupeKey: `repair:${row.id}`,
  });
  await notifyCustomer({
    userId: user?.id, email: v.email,
    title: `Repair request ${row.ref} received`,
    body: `Thank you — we received your repair request for your ${v.brand} ${v.model}. We'll contact you by ${v.preferred_contact} to arrange drop-off. After inspecting the guitar we'll send you a quote (labour and parts shown separately). No work will start until you approve the quote.`,
    link: user ? `/account/repairs/${row.id}` : undefined,
    dedupeKey: `repair-received:${row.id}`, relatedType: 'repair', relatedId: row.id,
  });

  return {
    ok: true,
    message: `Thank you! Your repair reference is ${row.ref}.${user ? ' You can follow progress in My account → Repairs.' : ''} We'll contact you to arrange drop-off. No work starts until you approve a quote.`,
    data: upload ? { ticket: upload.ticket, targets: upload.targets } : { uploadFailed: files.files.length > 0 },
  };
}
