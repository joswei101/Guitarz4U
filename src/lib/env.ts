// Central place for reading configuration. Optional integrations report whether
// they are configured so the UI never presents an unconfigured feature as working.

export const env = {
  siteUrl: (process.env.SITE_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, ""),
  databaseUrl: process.env.DATABASE_URL || "",
  databaseSsl: process.env.DATABASE_SSL === "true",
  storageDriver: (process.env.STORAGE_DRIVER || "local") as "local" | "s3",
  s3: {
    endpoint: process.env.S3_ENDPOINT || "",
    region: process.env.S3_REGION || "auto",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    publicBucket: process.env.S3_PUBLIC_BUCKET || "product-images",
    privateBucket: process.env.S3_PRIVATE_BUCKET || "private-uploads",
    publicUrl: (process.env.S3_PUBLIC_URL || "").replace(/\/$/, ""),
  },
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM || "Guitarz4U <Joshuaweinfas@gmail.com>",
  },
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL || "",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },
};

export const features = {
  email: Boolean(env.smtp.host && env.smtp.user && env.smtp.pass),
  google: Boolean(env.google.clientId && env.google.clientSecret),
};
