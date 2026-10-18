"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { safeNext } from "@/lib/safe-redirect";
import { type ActionResult, fieldErrors, passwordSchema } from "@/lib/validation";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(200);

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, "Enter your password").max(200) })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (/confirm/i.test(error.message))
      return { ok: false, error: "Please confirm your email address first — check your inbox for the link we sent." };
    if (error.status === 429) return { ok: false, error: "Too many attempts. Please wait a few minutes and try again." };
    return { ok: false, error: "Incorrect email or password." };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (formData.get("website")) return { ok: false, error: "Registration rejected." };
  const parsed = z
    .object({
      full_name: z.string().trim().min(2, "Please enter your name").max(120),
      email: emailSchema,
      password: passwordSchema,
      confirm: z.string(),
      privacy: z.literal("on", { message: "Please accept the privacy policy and terms" }),
    })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };

  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    if (error.status === 429) return { ok: false, error: "Too many sign-ups right now. Please try again later." };
    if (/password/i.test(error.message)) return { ok: false, error: error.message };
    return { ok: false, error: "We couldn't create your account. Please try again." };
  }
  // Email confirmation enabled → no session yet
  if (!data.session) {
    return {
      ok: true,
      message:
        "Almost done! We've sent a confirmation link to your email address. Click it to activate your account, then sign in. (Check your spam folder too.)",
    };
  }
  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordReset(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, error: "Enter a valid email address.", fieldErrors: { email: "Enter a valid email address" } };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });
  if (error?.status === 429) return { ok: false, error: "Too many requests. Please wait a few minutes." };
  // Same message whether or not the account exists (prevents account discovery).
  return {
    ok: true,
    message: "If an account exists for that email, we've sent a link to reset your password. It expires after an hour.",
  };
}

export async function updatePassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ password: passwordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (/different|same/i.test(error.message)) return { ok: false, error: "Choose a password different from your old one." };
    return { ok: false, error: "We couldn't update your password. Please request a new reset link." };
  }
  return { ok: true, message: "Your password has been updated." };
}
