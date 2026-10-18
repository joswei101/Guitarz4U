import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type Profile = Tables<"profiles">;

/** The signed-in user (verified with Supabase Auth) or null. Cached per request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});

/** For pages/actions that need a signed-in customer. */
export async function requireUser(next = "/account") {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const profile = await getProfile();
  return { user, profile };
}

/**
 * For every admin page and admin action. Non-admins get a 404 so the admin
 * area is not even revealed. The database independently enforces the same
 * rule with Row-Level Security.
 */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  const profile = await getProfile();
  if (profile?.role !== "admin") notFound();
  return { user, profile };
}

/** Same check for server actions: returns an error instead of redirecting. */
export async function assertAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in." };
  const profile = await getProfile();
  if (profile?.role !== "admin") return { ok: false, error: "Not authorised." };
  return { ok: true, userId: user.id };
}
