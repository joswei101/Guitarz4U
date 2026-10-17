import { z } from "zod";

/**
 * Server-side configuration. Optional integrations are detected from the presence of
 * their variables; the site keeps working (with honest "not configured" states) without them.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  CRON_SECRET: z.string().min(16).optional(),

  // PayFast (South African card gateway)
  PAYFAST_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYFAST_MERCHANT_ID: z.string().optional(),
  PAYFAST_MERCHANT_KEY: z.string().optional(),
  PAYFAST_PASSPHRASE: z.string().optional(),
  /** Set to "false" only for local testing without a public URL; never in production. */
  PAYFAST_VALIDATE_WITH_SERVER: z.enum(["true", "false"]).default("true"),

  // Email (any SMTP provider: Brevo, Resend SMTP, Amazon SES, Mailgun, Google Workspace...)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),
  EMAIL_FROM: z.string().optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),

  // File storage
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default("./storage"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Optional official WhatsApp Business Cloud API
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default("en"),

  // Optional AI pricing estimates
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_PRICING_MODEL: z.string().default("claude-opus-5-5"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  // Treat empty strings (e.g. copied from .env.example) as unset.
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== ""));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  if (parsed.data.NODE_ENV === "production" && parsed.data.SESSION_SECRET.startsWith("dev-")) {
    throw new Error("SESSION_SECRET must be replaced with a strong random value in production");
  }
  cached = parsed.data;
  return cached;
}

export const features = {
  email: () => Boolean(env().SMTP_HOST && env().EMAIL_FROM),
  payfast: () => Boolean(env().PAYFAST_MERCHANT_ID && env().PAYFAST_MERCHANT_KEY),
  s3: () => env().STORAGE_DRIVER === "s3",
  whatsapp: () => Boolean(env().WHATSAPP_PHONE_NUMBER_ID && env().WHATSAPP_ACCESS_TOKEN),
  aiPricing: () => Boolean(env().ANTHROPIC_API_KEY),
};

export function appUrl(path = ""): string {
  return new URL(path, env().APP_URL).toString();
}
