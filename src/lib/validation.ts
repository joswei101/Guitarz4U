import { z } from 'zod';
import { CATEGORIES, CONDITIONS, CONTACT_METHODS, REPAIR_SERVICES, REVIEW_TOPICS, SELLER_CONDITIONS } from '@/lib/labels';

// All user input is validated on the server with these schemas, even if the
// browser already checked it.

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

const req = (label: string, max: number, min = 1) =>
  z.string({ error: `${label} is required.` }).trim().min(min, `${label} is required.`).max(max, `${label} is too long (max ${max} characters).`);
const opt = (max: number) =>
  z.string().trim().max(max, `Too long (max ${max} characters).`).optional().transform((v) => (v ? v : null));

export const nameField = req('Your name', 120, 2);
export const emailField = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.')).pipe(z.string().max(254));
export const phoneField = z.string().trim().regex(/^\+?[\d\s()-]{9,20}$/, 'Enter a valid phone number, e.g. 064 856 7019.');
export const optPhone = z.string().trim().optional().transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\+?[\d\s()-]{9,20}$/.test(v), 'Enter a valid phone number, e.g. 064 856 7019.');
export const contactMethod = z.enum(keys(CONTACT_METHODS), { error: 'Choose a contact method.' });
const money = (label: string) =>
  z.coerce.number({ error: `${label} must be a number.` }).min(0, `${label} cannot be negative.`).max(9_999_999, `${label} is too large.`);
const optMoney = z.string().trim().optional().transform((v, ctx) => {
  if (!v) return null;
  const n = Number(v.replace(/[R\s,]/gi, ''));
  if (!Number.isFinite(n) || n < 0 || n > 9_999_999) {
    ctx.addIssue({ code: 'custom', message: 'Enter a valid amount in rand.' });
    return z.NEVER;
  }
  return n;
});
const consent = z.literal('on', { error: 'Please confirm to continue.' });

export const enquirySchema = z.object({
  name: nameField,
  email: emailField,
  phone: optPhone,
  preferred_contact: contactMethod,
  message: opt(4000),
  consent,
});

export const offerSchema = z.object({
  product_id: z.uuid(),
  name: nameField,
  email: emailField,
  phone: optPhone,
  amount: z.string().trim().transform((v) => Number(v.replace(/[R\s,]/gi, '')))
    .refine((n) => Number.isFinite(n) && n > 0 && n < 10_000_000, 'Enter your offer in rand.'),
  message: opt(2000),
  consent,
});

export const reservationSchema = z.object({
  product_id: z.uuid(),
  name: nameField,
  phone: phoneField,
  message: opt(2000),
  consent,
});

export const questionSchema = z.object({
  product_id: z.uuid().optional(),
  name: nameField,
  email: emailField,
  phone: optPhone,
  subject: opt(200),
  body: req('Your message', 4000, 5),
  consent,
});

export const stockAlertSchema = z.object({
  email: emailField,
  category: z.enum(keys(CATEGORIES)).optional().or(z.literal('').transform(() => undefined)),
  brand: opt(80),
  max_price: optMoney,
  keywords: opt(200),
  consent,
});

export const sellerSchema = z.object({
  name: nameField,
  email: emailField,
  whatsapp: phoneField,
  preferred_contact: contactMethod,
  brand: req('Brand', 80),
  model: req('Model', 120),
  category: z.enum([...keys(CATEGORIES), 'other'] as [string, ...string[]]).optional().or(z.literal('').transform(() => undefined)),
  condition: z.enum(keys(SELLER_CONDITIONS), { error: 'Choose the condition.' }),
  faults: opt(4000),
  is_giveaway: z.string().optional().transform((v) => v === 'on'),
  asking_price: optMoney,
  suburb: req('Suburb / area', 120),
  accessories: opt(1000),
  notes: opt(4000),
  not_parts: z.literal('on', { error: 'Please confirm this is a guitar, not loose parts.' }),
  consent,
}).superRefine((v, ctx) => {
  if (v.is_giveaway && v.asking_price) {
    ctx.addIssue({ code: 'custom', path: ['asking_price'], message: 'Leave the asking price empty if you are giving the guitar away.' });
  }
});

export const repairSchema = z.object({
  name: nameField,
  email: emailField,
  whatsapp: optPhone,
  preferred_contact: contactMethod,
  brand: req('Brand', 80),
  model: req('Model', 120),
  problem: req('A description of the problem', 4000, 5),
  services: z.array(z.enum(keys(REPAIR_SERVICES))).max(10).default([]),
  preferred_date: z.string().trim().optional().transform((v) => (v ? v : null))
    .refine((v) => v === null || (/^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v) >= new Date(new Date().toDateString())), 'Choose a date from today onwards.'),
  consent,
}).superRefine((v, ctx) => {
  if (v.preferred_contact === 'whatsapp' && !v.whatsapp) {
    ctx.addIssue({ code: 'custom', path: ['whatsapp'], message: 'Add your WhatsApp number, or choose email.' });
  }
});

export const reviewSchema = z.object({
  display_name: req('Display name', 60, 2),
  rating: z.coerce.number().int().min(1, 'Choose a rating.').max(5),
  title: opt(120),
  body: req('Your review', 2000, 10),
  related_to: z.enum(keys(REVIEW_TOPICS)),
  consent,
});

export const profileSchema = z.object({
  full_name: opt(120),
  whatsapp: optPhone,
  preferred_contact: contactMethod,
  notify_email: z.string().optional().transform((v) => v === 'on'),
  notify_stock_alerts: z.string().optional().transform((v) => v === 'on'),
});

export const productSchema = z.object({
  brand: req('Brand', 80),
  model: req('Model', 120),
  category: z.enum(keys(CATEGORIES), { error: 'Choose a category.' }),
  condition: z.enum(keys(CONDITIONS), { error: 'Choose a condition.' }),
  price: money('Price'),
  description: z.string().trim().max(8000).default(''),
  defects: z.string().trim().max(4000).default(''),
  public_serial: opt(80),
  serial_number: opt(80),
  provenance: z.string().trim().max(4000).default(''),
  accessories: z.string().trim().max(1000).default(''),
  year_made: opt(20),
  is_featured: z.string().optional().transform((v) => v === 'on'),
  is_new_arrival: z.string().optional().transform((v) => v === 'on'),
  description_approved: z.string().optional().transform((v) => v === 'on'),
  acquired_from: opt(200),
  acquisition_cost: optMoney,
  internal_notes: z.string().trim().max(4000).default(''),
});

export const passwordField = z.string().min(8, 'Use at least 8 characters.').max(72, 'Use at most 72 characters.');

export { money, optMoney };
