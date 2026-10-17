import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(200);
export const nameSchema = z.string().trim().min(2, "Enter your name").max(100);
export const phoneSchema = z
  .string()
  .trim()
  .min(9, "Enter a valid phone number")
  .max(20)
  .regex(/^[+0-9 ()-]+$/, "Enter a valid phone number");
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(200)
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), "Use a mix of letters and numbers");

export const consentSchema = z.literal("on", { errorMap: () => ({ message: "Please accept the privacy notice to continue" }) });

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  privacy: consentSchema,
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password").max(200) });

export const enquirySchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  instrumentType: z.string().trim().min(2).max(80),
  brand: z.string().trim().max(80).optional(),
  model: z.string().trim().max(120).optional(),
  condition: z.string().trim().min(2, "Describe the overall condition").max(80),
  faults: z.string().trim().max(3000).optional(),
  details: z.string().trim().max(3000).optional(),
  privacy: consentSchema,
});

export const repairSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  instrumentType: z.string().trim().min(2).max(80),
  brand: z.string().trim().max(80).optional(),
  model: z.string().trim().max(120).optional(),
  problem: z.string().trim().min(10, "Please describe the problem (at least 10 characters)").max(4000),
  services: z.array(z.string().max(80)).min(1, "Choose at least one service").max(16),
  notes: z.string().trim().max(3000).optional(),
  preferredDate: z.string().trim().optional(),
  preferredTimeNote: z.string().trim().max(200).optional(),
  privacy: consentSchema,
});

export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z.string().trim().max(20).optional(),
  subject: z.string().trim().min(2, "Add a subject").max(150),
  message: z.string().trim().min(10, "Please write a little more").max(4000),
  privacy: consentSchema,
  website: z.string().max(0).optional(), // honeypot: must stay empty
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(20, "Please write at least 20 characters").max(3000),
  displayName: z.string().trim().min(2).max(60),
  subject: z.enum(["PRODUCT", "REPAIR", "GENERAL"]),
  productId: z.string().optional(),
  repairId: z.string().optional(),
});

export function formToObject(form: FormData, arrays: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v !== "string") continue;
    if (arrays.includes(k)) {
      out[k] = (out[k] as string[] | undefined) ?? [];
      (out[k] as string[]).push(v);
    } else out[k] = v === "" ? undefined : v;
  }
  for (const a of arrays) out[a] ??= [];
  return out;
}

export function fieldErrors(err: z.ZodError) {
  return err.flatten().fieldErrors as Record<string, string[] | undefined>;
}
