import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { authenticate, registerUser, requestPasswordReset, resetPassword, verifyEmailToken } from "@/lib/auth/service";
import { validateSessionToken, SESSION_COOKIE, getCurrentUser } from "@/lib/auth/session";
import { loginAction, registerAction } from "@/app/actions/auth";
import { sha256 } from "@/lib/crypto";
import { cookieJar, sentEmails } from "../helpers/setup";
import { makeUser } from "../helpers/factories";

function tokenFrom(text: string, path: string) {
  const m = new RegExp(`${path}\\?token=([A-Za-z0-9_%-]+)`).exec(text);
  if (!m) throw new Error(`No ${path} link in email`);
  return decodeURIComponent(m[1]);
}

describe("registration & email verification", () => {
  it("creates an unverified account with a hashed password and sends a verification email", async () => {
    const { user } = await registerUser({ name: "Jane Player", email: "jane@example.com", password: "riffs-and-licks-9" });
    expect(user).toBeTruthy();
    const db = await prisma.user.findUniqueOrThrow({ where: { email: "jane@example.com" } });
    expect(db.emailVerifiedAt).toBeNull();
    expect(db.passwordHash).toMatch(/^\$argon2id\$/);
    expect(db.passwordHash).not.toContain("riffs-and-licks-9");
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].subject).toMatch(/Verify/);
    const token = tokenFrom(sentEmails[0].text, "/verify-email");
    // Only the hash of the token is stored.
    expect(await prisma.authToken.findFirst({ where: { tokenHash: token } })).toBeNull();
    expect(await verifyEmailToken(token)).toBe(true);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: db.id } })).emailVerifiedAt).not.toBeNull();
    // Tokens are single use.
    expect(await verifyEmailToken(token)).toBe(false);
  });

  it("does not reveal whether an email is already registered", async () => {
    await makeUser({ email: "taken@example.com" });
    const res = await registerUser({ name: "Someone", email: "taken@example.com", password: "another-pass-77" });
    expect(res.alreadyExists).toBe(true);
    expect(await prisma.user.count({ where: { email: "taken@example.com" } })).toBe(1);
  });

  it("links earlier guest repair submissions after verification", async () => {
    await prisma.repairRequest.create({ data: { reference: "REP-GUEST1", name: "Jo", email: "Jo@Example.com", phone: "0820000000", instrumentType: "Bass guitar", problem: "Buzzing everywhere", services: ["Fault diagnosis"], privacyConsentAt: new Date() } });
    const { user } = await registerUser({ name: "Jo", email: "jo@example.com", password: "low-end-theory-1" });
    await verifyEmailToken(tokenFrom(sentEmails[0].text, "/verify-email"));
    expect((await prisma.repairRequest.findUniqueOrThrow({ where: { reference: "REP-GUEST1" } })).userId).toBe(user!.id);
  });

  it("registerAction validates input server-side", async () => {
    const form = new FormData();
    form.set("name", "A");
    form.set("email", "not-an-email");
    form.set("password", "short");
    const res = await registerAction(null, form);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.fieldErrors?.email).toBeTruthy();
      expect(res.fieldErrors?.password).toBeTruthy();
      expect(res.fieldErrors?.privacy).toBeTruthy();
    }
    expect(await prisma.user.count()).toBe(0);
  });
});

describe("login & sessions", () => {
  it("authenticates with the right password and rejects the wrong one", async () => {
    const u = await makeUser({ email: "rock@example.com", password: "power-chords-11" });
    expect((await authenticate("ROCK@example.com", "power-chords-11")).id).toBe(u.id);
    await expect(authenticate("rock@example.com", "wrong-password-1")).rejects.toThrow(/Incorrect email or password/);
    await expect(authenticate("nobody@example.com", "whatever-123")).rejects.toThrow(/Incorrect email or password/);
  });

  it("blocks suspended accounts", async () => {
    const u = await makeUser({ email: "bad@example.com", password: "power-chords-11" });
    await prisma.user.update({ where: { id: u.id }, data: { status: "SUSPENDED" } });
    await expect(authenticate("bad@example.com", "power-chords-11")).rejects.toThrow(/suspended/);
  });

  it("loginAction sets an httpOnly session cookie whose hash is stored server-side, then redirects", async () => {
    await makeUser({ email: "fan@example.com", password: "power-chords-11" });
    const form = new FormData();
    form.set("email", "fan@example.com");
    form.set("password", "power-chords-11");
    await expect(loginAction(null, form)).rejects.toThrow(/NEXT_REDIRECT:\/account/);
    const token = cookieJar.get(SESSION_COOKIE)!;
    expect(token).toBeTruthy();
    expect(await prisma.session.findUnique({ where: { tokenHash: sha256(token) } })).toBeTruthy();
    expect((await getCurrentUser())?.email).toBe("fan@example.com");
  });

  it("rate-limits repeated failed logins", async () => {
    await makeUser({ email: "target@example.com", password: "power-chords-11" });
    const form = new FormData();
    form.set("email", "target@example.com");
    form.set("password", "guess-guess-1");
    let last;
    for (let i = 0; i < 12; i++) last = await loginAction(null, form);
    expect(last?.ok).toBe(false);
    if (last && !last.ok) expect(last.error).toMatch(/Too many attempts/);
  });

  it("rejects expired sessions", async () => {
    const u = await makeUser();
    await prisma.session.create({ data: { tokenHash: sha256("expired-token"), userId: u.id, expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSessionToken("expired-token")).toBeNull();
  });
});

describe("password reset", () => {
  it("resets the password with a single-use token and signs out other sessions", async () => {
    const u = await makeUser({ email: "forgetful@example.com", password: "old-password-12" });
    await prisma.session.create({ data: { tokenHash: sha256("old-session"), userId: u.id, expiresAt: new Date(Date.now() + 86400000) } });
    await requestPasswordReset("forgetful@example.com");
    const token = tokenFrom(sentEmails[0].text, "/reset-password");
    expect(await resetPassword(token, "brand-new-pass-34")).toBe(true);
    expect(await resetPassword(token, "another-pass-56")).toBe(false);
    expect(await validateSessionToken("old-session")).toBeNull();
    await expect(authenticate("forgetful@example.com", "old-password-12")).rejects.toThrow();
    expect((await authenticate("forgetful@example.com", "brand-new-pass-34")).id).toBe(u.id);
  });

  it("gives no signal for unknown emails", async () => {
    await requestPasswordReset("ghost@example.com");
    expect(sentEmails).toHaveLength(0);
  });

  it("rejects expired reset tokens", async () => {
    const u = await makeUser();
    await prisma.authToken.create({ data: { userId: u.id, type: "PASSWORD_RESET", tokenHash: sha256("stale"), expiresAt: new Date(Date.now() - 1) } });
    expect(await resetPassword("stale", "brand-new-pass-34")).toBe(false);
  });
});
