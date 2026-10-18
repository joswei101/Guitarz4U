import type { AuthTokenType } from "@prisma/client";
import { prisma } from "../db";
import { randomToken, sha256 } from "../crypto";

const TTL: Record<AuthTokenType, number> = {
  EMAIL_VERIFICATION: 48 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

/** Issues a single-use token. Only the hash is stored; previous unused tokens of the same type are revoked. */
export async function issueAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const token = randomToken(32);
  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } }),
    prisma.authToken.create({ data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TTL[type]) } }),
  ]);
  return token;
}

/** Atomically consumes a token. Returns the userId, or null if invalid/expired/already used. */
export async function consumeAuthToken(token: string, type: AuthTokenType): Promise<string | null> {
  const { count } = await prisma.authToken.updateMany({
    where: { tokenHash: sha256(token), type, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (count !== 1) return null;
  const record = await prisma.authToken.findUnique({ where: { tokenHash: sha256(token) }, select: { userId: true } });
  return record?.userId ?? null;
}
