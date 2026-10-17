import { prisma } from "../db";
import { UserError } from "../errors";
import { audit } from "../audit";
import { sendEmail } from "../notify";
import { dummyHash, hashPassword, verifyPassword } from "./password";
import { consumeAuthToken, issueAuthToken } from "./tokens";
import { destroyAllSessions } from "./session";

/** Core auth operations, independent of cookies so they can be unit-tested. */
export async function registerUser(input: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findFirst({ where: { email: { equals: input.email, mode: "insensitive" } } });
  if (existing) {
    // Avoid confirming which emails have accounts: tell the owner by email instead.
    await sendEmail("passwordReset", existing.email, { name: existing.name, token: await issueAuthToken(existing.id, "PASSWORD_RESET") }, existing.id);
    return { user: null, alreadyExists: true };
  }
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      profile: { create: { privacyAcceptedAt: new Date() } },
    },
  });
  await sendVerificationEmail(user.id);
  return { user, alreadyExists: false };
}

export async function sendVerificationEmail(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) return;
  const token = await issueAuthToken(user.id, "EMAIL_VERIFICATION");
  await sendEmail("verifyEmail", user.email, { name: user.name, token }, user.id);
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const userId = await consumeAuthToken(token, "EMAIL_VERIFICATION");
  if (!userId) return false;
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  // Link earlier guest submissions made with the same (now proven) email address.
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await prisma.repairRequest.updateMany({ where: { userId: null, email: { equals: user.email, mode: "insensitive" } }, data: { userId } });
  await prisma.purchaseEnquiry.updateMany({ where: { userId: null, email: { equals: user.email, mode: "insensitive" } }, data: { userId } });
  return true;
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user) {
    await verifyPassword(await dummyHash(), password);
    throw new UserError("Incorrect email or password.");
  }
  if (!(await verifyPassword(user.passwordHash, password))) throw new UserError("Incorrect email or password.");
  if (user.status === "SUSPENDED") throw new UserError("This account has been suspended. Please contact us.");
  if (user.status === "DELETED") throw new UserError("Incorrect email or password.");
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return user;
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, status: { in: ["ACTIVE", "DELETION_REQUESTED"] } } });
  if (!user) return; // same response either way
  const token = await issueAuthToken(user.id, "PASSWORD_RESET");
  await sendEmail("passwordReset", user.email, { name: user.name, token }, user.id);
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const userId = await consumeAuthToken(token, "PASSWORD_RESET");
  if (!userId) return false;
  // Proving control of the inbox also verifies the email address.
  const user = await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
  if (!user.emailVerifiedAt) await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  await destroyAllSessions(userId);
  await audit({ actorId: userId, action: "auth.password_reset", entityType: "User", entityId: userId });
  return true;
}
