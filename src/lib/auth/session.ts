import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "../db";
import { randomToken, sha256 } from "../crypto";

export const SESSION_COOKIE = "g4u_session";
const SESSION_DAYS = 30;
const RENEW_WITHIN_DAYS = 15;
const DAY = 24 * 60 * 60 * 1000;

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "status" | "emailVerifiedAt" | "phone">;

export async function createSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  await prisma.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt,
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    },
  });
  await setSessionCookie(token, expiresAt);
}

async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Validates a raw session token. Exported for tests and route handlers. */
export async function validateSessionToken(token: string): Promise<{ user: SessionUser; sessionId: string; renewed?: Date } | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, status: true, emailVerifiedAt: true, phone: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  if (session.user.status === "SUSPENDED" || session.user.status === "DELETED") return null;
  let renewed: Date | undefined;
  if (session.expiresAt.getTime() - Date.now() < RENEW_WITHIN_DAYS * DAY) {
    renewed = new Date(Date.now() + SESSION_DAYS * DAY);
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt: renewed } });
  }
  return { user: session.user, sessionId: session.id, renewed };
}

/** Current signed-in user for this request (memoised per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await validateSessionToken(token);
  if (result?.renewed) {
    // Cookies can only be modified in actions/route handlers; ignore elsewhere.
    try {
      await setSessionCookie(token, result.renewed);
    } catch {
      /* rendering context */
    }
  }
  return result?.user ?? null;
});

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  store.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
