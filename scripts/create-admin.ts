/**
 * Creates (or promotes) the owner/administrator account. There is no default admin password:
 * the password is read from ADMIN_PASSWORD or typed interactively, and must be strong.
 *
 *   npm run admin:create -- --email owner@example.com --name "Owner Name"
 *   npm run admin:create -- --email staff@example.com --name "Staff" --role CONTENT_MANAGER
 */
import { PrismaClient, type Role } from "@prisma/client";
import { createInterface } from "readline/promises";
import { hashPassword } from "../src/lib/auth/password";
import { passwordSchema } from "../src/lib/validation";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name") ?? "Owner";
  const role = (arg("role") ?? "ADMIN") as Role;
  if (!email || !["ADMIN", "CONTENT_MANAGER"].includes(role)) {
    console.error('Usage: npm run admin:create -- --email you@example.com --name "Your Name" [--role ADMIN|CONTENT_MANAGER]');
    process.exit(1);
  }
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Choose a strong password (min 12 chars, letters and numbers): ");
    rl.close();
  }
  if (password.length < 12 || !passwordSchema.safeParse(password).success) {
    console.error("Password too weak. Use at least 12 characters with letters and numbers.");
    process.exit(1);
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name, role, passwordHash, emailVerifiedAt: new Date(), profile: { create: {} } },
    update: { role, passwordHash, status: "ACTIVE", emailVerifiedAt: new Date() },
  });
  await prisma.auditLog.create({ data: { action: "admin.account_created_via_cli", entityType: "User", entityId: user.id, details: { role } } });
  console.log(`${role} account ready for ${email}. Sign in at /login — the dashboard is at /admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
