'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/env';
import { guardSubmission } from '@/lib/guard';
import { type ActionState, formValues, invalid } from '@/lib/action-state';
import { emailField, passwordField } from '@/lib/validation';

/** Only allow redirects to pages on this website (prevents "open redirect" attacks). */
function safeNext(next: unknown, fallback = '/account') {
  const n = typeof next === 'string' ? next : '';
  return n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') ? n : fallback;
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guardSubmission(formData, 'login', { max: 20, windowSeconds: 900 });
  if (blocked) return { error: blocked };
  const parsed = z.object({ email: emailField, password: z.string().min(1, 'Enter your password.') })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const values = { email: parsed.data.email };
    if (error.code === 'email_not_confirmed') {
      return { error: 'Please confirm your email address first — check your inbox (and spam folder) for the link. You can resend it below.', values, data: { unconfirmed: true } };
    }
    return { error: 'Incorrect email or password.', values };
  }
  redirect(safeNext(formData.get('next')));
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guardSubmission(formData, 'register', { max: 5, windowSeconds: 3600 });
  if (blocked) return { error: blocked, values: formValues(formData) };
  const schema = z.object({
    full_name: z.string().trim().min(2, 'Enter your name.').max(120),
    email: emailField,
    password: passwordField,
    confirm: z.string(),
    consent: z.literal('on', { error: 'Please accept the terms and privacy policy.' }),
  }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'The passwords do not match.' });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const res = invalid(formData, parsed.error);
    delete res.values?.password;
    delete res.values?.confirm;
    return res;
  }
  const supabase = await createClient();
  const next = safeNext(formData.get('next'));
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { full_name: parsed.data.full_name },
    },
  });
  if (error) {
    if (error.code === 'weak_password') return { error: 'Please choose a stronger password.', values: { full_name: parsed.data.full_name, email: parsed.data.email } };
    if (error.code === 'over_email_send_rate_limit') return { error: 'Too many sign-up emails were sent recently. Please try again later.' };
    return { error: 'We could not create your account. Please check your details and try again.', values: { full_name: parsed.data.full_name, email: parsed.data.email } };
  }
  if (data.session) redirect(next);
  // Same message whether or not the email is already registered (protects privacy).
  return { ok: true, message: `Almost done! We've sent a confirmation link to ${parsed.data.email}. Open it to activate your account. Check your spam folder if it doesn't arrive within a few minutes.` };
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const next = safeNext(formData.get('next'));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect('/auth/login?error=' + encodeURIComponent('Google sign-in is not available right now. Please use email and password.'));
  redirect(data.url);
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guardSubmission(formData, 'reset', { max: 5, windowSeconds: 3600 });
  if (blocked) return { error: blocked };
  const parsed = z.object({ email: emailField }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/auth/reset-password`,
  });
  // Always the same answer, so nobody can use this form to discover who has an account.
  return { ok: true, message: 'If an account exists for that email, a password reset link is on its way. The link expires after one hour.' };
}

export async function resendConfirmation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const blocked = await guardSubmission(formData, 'resend', { max: 3, windowSeconds: 3600 });
  if (blocked) return { error: blocked };
  const parsed = z.object({ email: emailField }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(formData, parsed.error);
  const supabase = await createClient();
  await supabase.auth.resend({
    type: 'signup', email: parsed.data.email,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=/account` },
  });
  return { ok: true, message: 'If that account is waiting for confirmation, we have sent a new link.' };
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ password: passwordField, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'The passwords do not match.' })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please correct the highlighted fields.', fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: 'Your reset link has expired. Please request a new one.' };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === 'same_password') return { error: 'Your new password must be different from the old one.' };
    return { error: 'Your password could not be changed. Please try again.' };
  }
  redirect('/account?ok=' + encodeURIComponent('Your password has been changed.'));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/?ok=' + encodeURIComponent('You have been signed out.'));
}
