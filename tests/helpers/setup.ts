import { vi, beforeEach, afterAll } from "vitest";
import { sha256 } from "@/lib/crypto";

// ── Next.js request-context shims ─────────────────────────────
// Server code reads cookies()/headers(); tests drive them through this in-memory store.
export const cookieJar = new Map<string, string>();
export const requestHeaders = new Headers({ "x-forwarded-for": "127.0.0.1", "user-agent": "vitest" });

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
    set: (name: string, value: string) => void cookieJar.set(name, value),
    delete: (name: string) => void cookieJar.delete(name),
  }),
  headers: async () => requestHeaders,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    const err = new Error(`NEXT_REDIRECT:${url}`) as Error & { digest: string };
    err.digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw err;
  },
  notFound: () => {
    const err = new Error("NEXT_NOT_FOUND") as Error & { digest: string };
    err.digest = "NEXT_HTTP_ERROR_FALLBACK;404";
    throw err;
  },
}));

// ── Email capture ─────────────────────────────────────────────
import { setMailTransport, type OutgoingEmail } from "@/lib/email/mailer";
export const sentEmails: OutgoingEmail[] = [];
setMailTransport({ send: async (e) => (sentEmails.push(e), { messageId: `test-${sentEmails.length}` }) });

// ── In-memory file storage ────────────────────────────────────
import { setStorageDriver } from "@/lib/storage";
export const storedFiles = new Map<string, Buffer>();
setStorageDriver({
  put: async (k, b) => void storedFiles.set(k, b),
  get: async (k) => storedFiles.get(k) ?? null,
  delete: async (k) => void storedFiles.delete(k),
});

import { prisma } from "@/lib/db";
import { resetDb } from "./db";

beforeEach(async () => {
  cookieJar.clear();
  sentEmails.length = 0;
  storedFiles.clear();
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { sha256 };
