import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/helpers/global-setup.ts"],
    setupFiles: ["tests/helpers/setup.ts"],
    // Tests share one PostgreSQL test database, so files run one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://guitarz:guitarz@localhost:5432/guitarz4u_test?schema=public",
      APP_URL: "http://localhost:3000",
      CRON_SECRET: "test-cron-secret-0123456789",
      // PayFast's public sandbox test merchant — never live credentials in tests.
      PAYFAST_MODE: "sandbox",
      PAYFAST_MERCHANT_ID: "10000100",
      PAYFAST_MERCHANT_KEY: "46f0cd694581a",
      PAYFAST_PASSPHRASE: "jt7NOE43FZPn",
      PAYFAST_VALIDATE_WITH_SERVER: "true",
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_DIR: "./storage-test",
      SMTP_HOST: "",
      ANTHROPIC_API_KEY: "",
      WHATSAPP_ACCESS_TOKEN: "",
    },
  },
});
