"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, formToObject, isBot, success, zodFieldErrors, type ActionState } from "@/lib/actions";
import { passwordSchema, saPhone } from "@/lib/validation";
import { SITE_URL } from "@/lib/env";

/** Only allow same-site relative redirects (prevents open redirects). */
function safeNext(value: FormDataEntryValue | string | null | undefined, fallback = "/account") {
  const next = typeof value === "string" ? value : "";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

function authMessage(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email address or password.";
  if (m.includes("email not confirmed")) return "Please verify your email address first. Check your inbox for the verification link.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email address already exists. Try signing in or resetting your password.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a few minutes and try again.";
  if (m.includes("weak") || m.includes("password")) return message;
  return "We couldn't complete that request. Please try again.";
}

const signInSchema = z.object({
  email: z.email("Please enter a valid email address.").max(200),
  password: z.string().min(1, "Please enter your password.").max(72),
});

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail(authMessage(error.message));
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

const signUpSchema = z
  .object({
    full_name: z.string().trim().min(2, "Please enter your name.").max(120),
    email: z.email("Please enter a valid email address.").max(200),
    phone: saPhone.optional().default(""),
    password: passwordSchema,
    confirm_password: z.string(),
    accept: z.literal("on", "Please accept the terms and privacy policy."),
  })
  .refine((v) => v.password === v.confirm_password, { message: "Passwords do not match.", path: ["confirm_password"] });

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (isBot(formData)) return success("Please check your email to verify your account.");
  const parsed = signUpSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}`,
      data: { full_name: v.full_name, phone: v.phone },
    },
  });
  if (error) return fail(authMessage(error.message));
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }
  // Supabase returns a user with no identities when the email is already registered.
  return success(
    "Almost done! We've sent a verification link to your email address. Please open it to activate your account. (Check your spam folder if it doesn't arrive within a few minutes.)",
  );
}

export async function resendVerificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return fail("Please enter a valid email address.");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.data,
    options: { emailRedirectTo: `${SITE_URL}/auth/confirm?next=/account` },
  });
  if (error) return fail(authMessage(error.message));
  return success("If that address has an unverified account, we've sent a new verification link.");
}

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return fail("Please enter a valid email address.", { email: "Please enter a valid email address." });
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${SITE_URL}/auth/confirm?next=/reset-password`,
  });
  if (error && /rate limit|too many/i.test(error.message)) return fail(authMessage(error.message));
  // Same response whether or not the account exists (prevents account discovery).
  return success("If an account exists for that email address, we've sent a password reset link. It expires after a short time.");
}

const updatePasswordSchema = z
  .object({ password: passwordSchema, confirm_password: z.string() })
  .refine((v) => v.password === v.confirm_password, { message: "Passwords do not match.", path: ["confirm_password"] });

export async function updatePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fail("Your reset link has expired. Please request a new one.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(authMessage(error.message));
  return success("Your password has been updated.");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
