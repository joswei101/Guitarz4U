import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./session";
import { can, type Permission } from "../permissions";
import { AuthError, ForbiddenError, UserError } from "../errors";

/** For pages: redirect to login when signed out. */
export async function requireUserPage(nextPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** For pages: staff permission check. Customers get a 404 so the admin area is not advertised. */
export async function requirePermissionPage(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/admin`);
  if (!can(user.role, permission)) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
  return user;
}

/** For actions/route handlers. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

export async function requireVerifiedUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.emailVerifiedAt) throw new UserError("Please verify your email address first. Check your inbox or resend the verification email from your account.", 403);
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) throw new ForbiddenError();
  return user;
}
