import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Permission } from '@/lib/labels';

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  whatsapp: string | null;
  preferred_contact: string;
  role: 'customer' | 'staff' | 'owner';
  permissions: string[];
  is_blocked: boolean;
  notify_email: boolean;
  notify_stock_alerts: boolean;
};

/** The signed-in user (verified with the auth server), or null. Cached per request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return (data as Profile | null) ?? null;
});

export function profileHasPerm(profile: Profile | null, perm: Permission) {
  if (!profile || profile.is_blocked) return false;
  if (profile.role === 'owner') return true;
  return profile.role === 'staff' && profile.permissions.includes(perm);
}

export function isStaffProfile(profile: Profile | null) {
  return Boolean(profile && !profile.is_blocked && (profile.role === 'owner' || profile.role === 'staff'));
}

/** Use at the top of private pages and server actions. */
export async function requireUser(next = '/account') {
  const user = await getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  const profile = await getProfile();
  if (profile?.is_blocked) redirect('/auth/blocked');
  return { user, profile: profile! };
}

/** Use in admin pages/actions. The database enforces the same rule again. */
export async function requireStaff(perm?: Permission) {
  const { user, profile } = await requireUser('/admin');
  if (!isStaffProfile(profile)) redirect('/');
  if (perm && !profileHasPerm(profile, perm)) redirect('/admin?error=' + encodeURIComponent('You do not have permission for that area.'));
  return { user, profile };
}
