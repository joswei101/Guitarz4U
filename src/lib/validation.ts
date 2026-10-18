import { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9 +()-]{9,20}$/, "Enter a valid phone number, e.g. 082 123 4567");

const optionalPhone = z.union([z.literal(""), phoneSchema]).optional().transform((v) => v || null);
const optionalEmail = z
  .union([z.literal(""), z.string().trim().email("Enter a valid email address").max(200)])
  .optional()
  .transform((v) => v || null);

export const contactMethod = z.enum(["whatsapp", "email", "phone"]);

export const contactFields = {
  contact_name: z.string().trim().min(2, "Please enter your name").max(120),
  contact_phone: optionalPhone,
  contact_email: optionalEmail,
  preferred_contact: contactMethod.default("whatsapp"),
};

function requireAContact<T extends { contact_phone: string | null; contact_email: string | null; preferred_contact: string }>(
  v: T,
  ctx: z.RefinementCtx,
) {
  if (!v.contact_phone && !v.contact_email) {
    ctx.addIssue({ code: "custom", path: ["contact_phone"], message: "Please give a phone number or email address" });
  }
  if ((v.preferred_contact === "whatsapp" || v.preferred_contact === "phone") && !v.contact_phone) {
    ctx.addIssue({ code: "custom", path: ["contact_phone"], message: "A phone number is needed for WhatsApp or calls" });
  }
  if (v.preferred_contact === "email" && !v.contact_email) {
    ctx.addIssue({ code: "custom", path: ["contact_email"], message: "Please enter your email address" });
  }
}

const money = z
  .union([z.literal(""), z.coerce.number().min(0, "Must be zero or more").max(10_000_000)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const conditionEnum = z.enum(["mint", "excellent", "very_good", "good", "fair", "needs_repair"]);

export const purchaseRequestSchema = z
  .object({
    ...contactFields,
    message: z.string().trim().max(2000).default(""),
    items: z
      .array(z.object({ product_id: z.string().uuid(), quantity: z.coerce.number().int().min(1).max(99) }))
      .min(1, "Your request cart is empty")
      .max(20),
  })
  .superRefine(requireAContact);

export const reservationSchema = z
  .object({ ...contactFields, product_id: z.string().uuid(), message: z.string().trim().max(2000).default("") })
  .superRefine(requireAContact);

export const sellerSubmissionSchema = z
  .object({
    ...contactFields,
    location: z.string().trim().max(120).optional().transform((v) => v || null),
    brand: z.string().trim().min(1, "Please enter the brand").max(80),
    model: z.string().trim().min(1, "Please enter the model").max(120),
    category_id: z.coerce.number().int().positive("Please choose a guitar type"),
    condition: conditionEnum,
    is_working: z.enum(["yes", "no"], { message: "Please tell us whether it works" }).transform((v) => v === "yes"),
    defects: z.string().trim().max(4000).default(""),
    asking_price: money,
    notes: z.string().trim().max(4000).default(""),
    privacy_consent: z.literal("on", { message: "Please agree to the privacy notice" }).transform(() => true),
    not_loose_parts: z.literal("on", { message: "Please confirm this is a complete guitar" }).transform(() => true),
  })
  .superRefine(requireAContact);

export const repairBookingSchema = z
  .object({
    ...contactFields,
    guitar_type: z.enum(["electric", "bass", "acoustic", "classical", "other"]),
    brand: z.string().trim().max(80).default(""),
    model: z.string().trim().max(120).default(""),
    problem_description: z.string().trim().min(10, "Please describe the problem (at least 10 characters)").max(4000),
    requested_services: z
      .array(z.enum(["strings", "setup", "electronics", "body", "hardware", "fretwork", "other"]))
      .min(1, "Choose at least one type of repair"),
    preferred_date: z
      .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
      .optional()
      .transform((v) => v || null)
      .refine((v) => !v || v >= new Date().toISOString().slice(0, 10), "Choose a date in the future"),
    notes: z.string().trim().max(4000).default(""),
    privacy_consent: z.literal("on", { message: "Please agree to the privacy notice" }).transform(() => true),
  })
  .superRefine(requireAContact);

export const reviewSchema = z.object({
  display_name: z.string().trim().min(2, "Please enter a display name").max(60),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  title: z.string().trim().max(120).default(""),
  body: z.string().trim().min(20, "Please write at least 20 characters").max(2000),
});

export const contactMessageSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name").max(120),
    email: optionalEmail,
    phone: optionalPhone,
    subject: z.string().trim().max(150).default(""),
    message: z.string().trim().min(10, "Please write a little more (at least 10 characters)").max(4000),
  })
  .refine((v) => v.email || v.phone, { path: ["email"], message: "Give an email address or phone number" });

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name").max(120),
  phone: optionalPhone,
  preferred_contact: contactMethod,
});

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const productSchema = z.object({
  title: z.string().trim().min(3, "Title is required").max(140),
  brand_id: z.union([z.literal(""), z.coerce.number().int().positive()]).transform((v) => (v === "" ? null : v)),
  model: z.string().trim().max(120).optional().transform((v) => v || null),
  category_id: z.coerce.number().int().positive("Choose a category"),
  price: z.coerce.number().min(0, "Price must be zero or more").max(10_000_000),
  compare_at_price: money,
  condition: conditionEnum,
  description: z.string().trim().max(8000).default(""),
  defects: z.string().trim().max(4000).default(""),
  history: z.string().trim().max(4000).default(""),
  year_made: z.string().trim().max(20).optional().transform((v) => v || null),
  quantity: z.coerce.number().int().min(0).max(999).default(1),
  status: z.enum(["draft", "published", "reserved", "sold", "archived"]),
  featured: z
    .union([z.literal("on"), z.literal("")])
    .optional()
    .transform((v) => v === "on"),
  serial_number: z.string().trim().max(120).optional().transform((v) => v || null),
  acquisition_cost: money,
  acquired_from: z.string().trim().max(500).optional().transform((v) => v || null),
  internal_notes: z.string().trim().max(4000).optional().transform((v) => v || null),
});

/** Turn a ZodError into a { field: message } map for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function formDataToObject(fd: FormData, arrays: string[] = []) {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (arrays.includes(key)) {
      (obj[key] as unknown[] | undefined) ? (obj[key] as unknown[]).push(value) : (obj[key] = [value]);
    } else {
      obj[key] = typeof value === "string" ? value : value;
    }
  }
  for (const a of arrays) if (!obj[a]) obj[a] = [];
  return obj;
}

/** Friendly text for database errors (never leaks internals). */
export function friendlyDbError(error: { message?: string; code?: string; hint?: string } | null | undefined) {
  if (!error) return "Something went wrong. Please try again.";
  const msg = error.message || "";
  if (error.code === "42501" || /row-level security|permission denied/i.test(msg))
    return "You do not have permission to do that.";
  if (error.code === "23505") return "That already exists.";
  if (error.code === "23514") return "Some of the information is not valid. Please check the form.";
  if (error.code === "P0001" || error.hint === "rate_limited" || error.hint === "unavailable") return msg;
  if (/^[A-Z][^]*\.$/.test(msg) && msg.length < 200) return msg; // our own RAISE messages
  return "Something went wrong. Please try again.";
}
