import { betterAuth } from "better-auth";
import { pool } from "./db";
import { env, features } from "./env";
import { sendEmail } from "./email";

export const auth = betterAuth({
  appName: "Guitarz4U",
  baseURL: env.siteUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  telemetry: { enabled: false },
  user: {
    additionalFields: {
      // Roles are assigned only by the server (see scripts/create-admin.ts).
      role: { type: "string", required: false, defaultValue: "customer", input: false },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    // Verification can only be required when email delivery is configured,
    // otherwise nobody could ever log in.
    requireEmailVerification: features.email,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Guitarz4U password",
        text: `Hi ${user.name},\nSomeone (hopefully you) asked to reset your Guitarz4U password. The link expires in one hour. If you did not ask for this, you can ignore this email.`,
        actionUrl: url,
        actionLabel: "Choose a new password",
      });
    },
  },
  emailVerification: {
    sendOnSignUp: features.email,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Confirm your Guitarz4U email address",
        text: `Hi ${user.name},\nPlease confirm your email address to finish creating your Guitarz4U account.`,
        actionUrl: url,
        actionLabel: "Confirm email address",
      });
    },
  },
  socialProviders: features.google
    ? { google: { clientId: env.google.clientId, clientSecret: env.google.clientSecret } }
    : {},
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production" || process.env.RATE_LIMIT_IN_DEV === "true",
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 300, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
    },
  },
  advanced: {
    ipAddress: { ipAddressHeaders: ["x-nf-client-connection-ip", "x-forwarded-for"] },
  },
});

export type Session = typeof auth.$Infer.Session;
