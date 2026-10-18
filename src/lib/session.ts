import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "customer" | "admin";
};

/** Reads the signed-in user from the session cookie (validated server-side). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string; deletedAt?: Date | null };
  if (u.deletedAt) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    role: u.role === "admin" ? "admin" : "customer",
  };
});

export async function requireUser(next = "/account"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Server-side admin guard. Every admin page AND every admin action calls this. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/account?denied=1");
  return user;
}

/** Variant for API routes: returns null instead of redirecting. */
export async function getAdminOrNull(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user && user.role === "admin" ? user : null;
}
