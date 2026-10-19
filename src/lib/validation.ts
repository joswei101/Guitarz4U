import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max, `Please keep this under ${max} characters.`);

export const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.email("Please enter a valid email address.").optional());

export const saPhone = z
  .string()
  .trim()
  .max(30)
  .refine((v) => !v || /^[+()\d\s-]{9,20}$/.test(v), "Please enter a valid phone number, e.g. 082 123 4567.");

export const requiredPhone = saPhone.refine((v) => v.length > 0, "Please enter a phone number.");

export const contactMethod = z.enum(["whatsapp", "email", "phone"]);

export const name = z.string().trim().min(2, "Please enter your name.").max(120);

export const enquirySchema = z
  .object({
    name,
    email: optionalEmail,
    phone: saPhone.optional().default(""),
    subject: z.string().trim().min(2, "Please add a subject.").max(150),
    message: z.string().trim().min(5, "Please write a little more.").max(3000),
    product_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((v) => v.email || v.phone, { message: "Please provide an email address or a phone number.", path: ["email"] });

export const contactDetailsSchema = z
  .object({
    contact_name: name,
    contact_email: optionalEmail,
    contact_phone: saPhone.optional().default(""),
    preferred_contact: contactMethod,
    message: trimmed(2000).optional().default(""),
  })
  .refine((v) => v.contact_email || v.contact_phone, {
    message: "Please provide an email address or a phone number.",
    path: ["contact_email"],
  })
  .refine((v) => v.preferred_contact !== "email" || v.contact_email, {
    message: "Please add an email address if you prefer email.",
    path: ["contact_email"],
  })
  .refine((v) => v.preferred_contact === "email" || v.contact_phone, {
    message: "Please add a phone number for WhatsApp or phone contact.",
    path: ["contact_phone"],
  });

export const imagePaths = z.array(z.string().max(400)).max(8).default([]);

const money = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v.replace(/[\sR,]/gi, "")) : undefined))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0 && v < 10_000_000), "Please enter a valid amount in rand.");

export const sellerSubmissionSchema = z.object({
  seller_name: name,
  contact_number: requiredPhone,
  email: optionalEmail,
  brand: z.string().trim().min(1, "Please enter the brand.").max(60),
  model: z.string().trim().min(1, "Please enter the model (or 'Unknown').").max(100),
  category_id: z.coerce.number().int().positive("Please choose a category."),
  condition: z.enum(["mint", "excellent", "very_good", "good", "fair", "project"], "Please choose a condition."),
  is_working: z.enum(["yes", "partially", "no", "unsure"], "Please tell us whether it works."),
  fault_description: trimmed(3000).optional().default(""),
  asking_price: money,
  notes: trimmed(3000).optional().default(""),
  privacy_ack: z.literal("on", "Please acknowledge the privacy notice."),
  not_loose_parts: z.literal("on", "Please confirm this is a guitar, not loose parts."),
  image_paths: imagePaths,
});

export const repairBookingSchema = z.object({
  contact_name: name,
  contact_phone: requiredPhone,
  contact_email: optionalEmail,
  preferred_contact: contactMethod,
  guitar_brand: z.string().trim().min(1, "Please enter the brand.").max(60),
  guitar_model: trimmed(100).optional().default(""),
  category_id: z.coerce.number().int().positive().optional(),
  services: z
    .array(z.enum(["strings", "setup", "electronics", "body", "hardware", "fretwork", "other"]))
    .min(1, "Please choose at least one type of work."),
  problem_description: z.string().trim().min(10, "Please describe the problem in a little more detail.").max(3000),
  preferred_date: z
    .string()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Please choose a valid date."),
  notes: trimmed(2000).optional().default(""),
  image_paths: imagePaths,
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Please choose a rating.").max(5),
  title: z.string().trim().min(3, "Please add a short title.").max(100),
  body: z.string().trim().min(20, "Please write at least 20 characters.").max(2000),
});

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Please use 72 characters or fewer.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use a mix of letters and numbers.");

export const productSchema = z.object({
  title: z.string().trim().min(3, "Please enter a title.").max(140),
  brand_name: trimmed(60).optional().default(""),
  model: trimmed(100).optional().default(""),
  category_id: z.coerce.number().int().positive("Please choose a category."),
  price: z.coerce.number().min(0, "Price cannot be negative.").max(9_999_999),
  compare_at_price: money,
  condition: z.enum(["mint", "excellent", "very_good", "good", "fair", "project"]),
  functional_status: z.enum(["fully_working", "minor_issues", "needs_repair", "not_working"]),
  status: z.enum(["draft", "published", "reserved", "sold", "archived"]),
  description: trimmed(8000).optional().default(""),
  defects: trimmed(4000).optional().default(""),
  history: trimmed(4000).optional().default(""),
  specifications: trimmed(4000).optional().default(""),
  included_items: trimmed(1000).optional().default(""),
  year_made: trimmed(20).optional().default(""),
  colour: trimmed(60).optional().default(""),
  is_featured: z.string().optional().transform((v) => v === "on"),
  serial_number: trimmed(80).optional().default(""),
  acquisition_notes: trimmed(4000).optional().default(""),
  internal_notes: trimmed(4000).optional().default(""),
});
