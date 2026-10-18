"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { runAction } from "@/lib/action";
import { clientIp } from "@/lib/http";
import { enforceRateLimit, limits } from "@/lib/rate-limit";
import { emailSchema, formToObject, loginSchema, passwordSchema, registerSchema } from "@/lib/validation";
import { authenticate, registerUser, requestPasswordReset, resetPassword, sendVerificationEmail } from "@/lib/auth/service";
import { createSession, destroyCurrentSession } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/guards";
import { mergeGuestCart } from "@/lib/shop/cart";
import { isStaff } from "@/lib/permissions";
import type { ActionResult } from "@/lib/errors";

function safeNext(next: FormDataEntryValue | null, fallback: string): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : fallback;
}

export async function registerAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let created = false;
  const result = await runAction<undefined>(async () => {
    await enforceRateLimit(`register:${await clientIp()}`, limits.register.limit, limits.register.window);
    const data = registerSchema.parse(formToObject(form));
    const { user, alreadyExists } = await registerUser(data);
    if (alreadyExists || !user) {
      return { ok: true, message: "Check your inbox — we've emailed you the next step. If you already have an account, use the link in that email to sign in or reset your password." };
    }
    await createSession(user.id);
    await mergeGuestCart(user.id);
    created = true;
  });
  if (created) redirect(`/account?welcome=1`);
  return result;
}

export async function loginAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let target: string | null = null;
  const result = await runAction<undefined>(async () => {
    const data = loginSchema.parse(formToObject(form));
    const ip = await clientIp();
    await enforceRateLimit(`login:ip:${ip}`, limits.login.limit * 3, limits.login.window);
    await enforceRateLimit(`login:email:${data.email}`, limits.login.limit, limits.login.window);
    const user = await authenticate(data.email, data.password);
    await createSession(user.id);
    await mergeGuestCart(user.id);
    target = safeNext(form.get("next"), isStaff(user.role) ? "/admin" : "/account");
  });
  if (target) redirect(target);
  return result;
}

export async function logoutAction() {
  await destroyCurrentSession();
  redirect("/");
}

export async function resendVerificationAction(_prev: ActionResult | null): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await enforceRateLimit(`verify:${user.id}`, 3, 60 * 60);
    await sendVerificationEmail(user.id);
    return { ok: true, message: "Verification email sent. Please check your inbox (and spam folder)." };
  });
}

export async function forgotPasswordAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await enforceRateLimit(`reset:${await clientIp()}`, limits.passwordReset.limit, limits.passwordReset.window);
    const email = emailSchema.parse(form.get("email"));
    await requestPasswordReset(email);
    return { ok: true, message: "If an account exists for that email, a reset link is on its way. It expires in 1 hour." };
  });
}

export async function resetPasswordAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  let done = false;
  const result = await runAction<undefined>(async () => {
    await enforceRateLimit(`resetuse:${await clientIp()}`, 10, 60 * 60);
    const { token, password } = z.object({ token: z.string().min(10).max(200), password: passwordSchema }).parse(formToObject(form));
    if (form.get("confirm") !== password) return { ok: false, error: "The passwords don't match.", fieldErrors: { confirm: ["The passwords don't match."] } };
    if (!(await resetPassword(token, password))) return { ok: false, error: "This reset link is invalid or has expired. Please request a new one." };
    done = true;
  });
  if (done) redirect("/login?reset=1");
  return result;
}
