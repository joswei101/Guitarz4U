import { z } from "zod";

// Shared input validation. Every server route validates with these schemas —
// browser-side checks are only a convenience.

const trimmed = (max: number) => z.string().trim().max(max);

export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .refine((v) => v === "" || (/^[+\d\s()-]+$/.test(v) && v.replace(/\D/g, "").length >= 9 && v.replace(/\D/g, "").length <= 15), {
    message: "Please enter a valid phone number, e.g. 082 123 4567.",
  });

export const emailSchema = z.string().trim().toLowerCase().max(200).pipe(z.email({ message: "Please enter a valid email address." }));
export const optionalEmail = z.union([z.literal(""), emailSchema]);
export const contactMethod = z.enum(["whatsapp", "email", "phone"]);
export const categoryId = z.coerce.number().int().min(1).max(1000);
export const conditionSchema = z.enum(["excellent", "very_good", "good", "fair", "poor", "for_repair"]);

const randAmount = z
  .string()
  .trim()
  .max(20)
  .refine((v) => v === "" || /^R?\s?[\d\s]+([.,]\d{1,2})?$/i.test(v), { message: "Please enter an amount in rand, e.g. 4500." });

export const contactFields = {
  name: trimmed(120).min(2, "Please enter your name."),
  email: emailSchema,
  phone: phoneSchema,
  preferredContact: contactMethod,
};

function requirePhoneForWhatsApp<T extends { preferredContact: string; phone: string }>(data: T, ctx: z.RefinementCtx) {
  if ((data.preferredContact === "whatsapp" || data.preferredContact === "phone") && !data.phone) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "Please add a phone number so we can contact you that way." });
  }
}

export const purchaseRequestSchema = z
  .object({
    ...contactFields,
    message: trimmed(2000).default(""),
    productIds: z.array(z.uuid()).min(1, "Your request cart is empty.").max(10, "Please request at most 10 items at a time."),
    acknowledge: z.literal(true, { message: "Please confirm you understand that no payment is taken online." }),
  })
  .superRefine(requirePhoneForWhatsApp);

export const reservationSchema = z
  .object({
    ...contactFields,
    message: trimmed(2000).default(""),
    productId: z.uuid(),
  })
  .superRefine(requirePhoneForWhatsApp);

export const sellerSubmissionSchema = z.object({
  name: trimmed(120).min(2, "Please enter your name."),
  phone: phoneSchema.refine((v) => v !== "", "Please enter a contact number."),
  email: optionalEmail,
  brand: trimmed(80).min(1, "Please enter the brand."),
  model: trimmed(120).default(""),
  categoryId,
  condition: conditionSchema,
  works: z.enum(["yes", "partly", "no", "unsure"]),
  faults: trimmed(4000).default(""),
  askingPrice: randAmount.default(""),
  notes: trimmed(4000).default(""),
  privacyAck: z.literal("on", { message: "Please acknowledge the privacy notice." }),
  notLoosePart: z.literal("on", { message: "Please confirm this is a complete or repairable guitar, not loose parts." }),
});

export const repairBookingSchema = z
  .object({
    name: trimmed(120).min(2, "Please enter your name."),
    phone: phoneSchema.refine((v) => v !== "", "Please enter a contact number."),
    email: optionalEmail,
    preferredContact: contactMethod,
    brand: trimmed(80).min(1, "Please enter the guitar brand."),
    model: trimmed(120).default(""),
    categoryId,
    problem: trimmed(4000).min(10, "Please describe the problem (at least 10 characters)."),
    services: z.array(z.enum(["strings", "setup", "electronics", "body", "hardware", "fretwork", "other"])).default([]),
    preferredDate: z.union([z.literal(""), z.iso.date()]).default(""),
    notes: trimmed(4000).default(""),
    privacyAck: z.literal("on", { message: "Please acknowledge the privacy notice." }),
  })
  .superRefine((d, ctx) => {
    if (d.preferredContact === "email" && !d.email) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Please add an email address so we can contact you by email." });
    }
  });

export const contactMessageSchema = z.object({
  name: trimmed(120).min(2, "Please enter your name."),
  email: optionalEmail,
  phone: phoneSchema,
  preferredContact: contactMethod,
  subject: trimmed(160).default(""),
  message: trimmed(4000).min(5, "Please enter a message."),
  productId: z.union([z.literal(""), z.uuid()]).default(""),
}).superRefine((d, ctx) => {
  if (!d.email && !d.phone) ctx.addIssue({ code: "custom", path: ["email"], message: "Please give us an email address or phone number." });
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: trimmed(120).default(""),
  body: trimmed(2000).min(10, "Please write at least 10 characters."),
  displayName: trimmed(60).min(1, "Please enter the name to show with your review."),
});

/** Converts a ZodError into { field: message } for the forms. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "form");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

/** Honeypot + minimum fill time spam check used on public forms. */
export function looksLikeSpam(form: FormData): boolean {
  if (String(form.get("website") ?? "") !== "") return true;
  const started = Number(form.get("startedAt") ?? 0);
  if (started && Date.now() - started < 2500) return true;
  return false;
}
