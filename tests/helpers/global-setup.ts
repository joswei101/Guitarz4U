import { execSync } from "child_process";

/** Applies any pending migrations to the dedicated test database before the suite runs. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://guitarz:guitarz@localhost:5432/guitarz4u_test?schema=public";
  if (!/test/.test(new URL(url).pathname)) throw new Error("Refusing to run tests against a database whose name does not contain 'test'");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
