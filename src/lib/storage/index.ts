import { promises as fs } from "fs";
import path from "path";
import { env } from "../env";

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  /** Optional time-limited direct URL (S3/R2). Local storage streams through the app instead. */
  signedUrl?(key: string, expiresSeconds: number): Promise<string>;
}

function safeKey(key: string): string {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes("..")) throw new Error("Invalid storage key");
  return key;
}

class LocalStorage implements StorageDriver {
  constructor(private root: string) {}
  private resolve(key: string) {
    return path.join(path.resolve(this.root), safeKey(key));
  }
  async put(key: string, body: Buffer) {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body, { mode: 0o600 });
  }
  async get(key: string) {
    try {
      return await fs.readFile(this.resolve(key));
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

class S3Storage implements StorageDriver {
  private clientPromise: Promise<import("@aws-sdk/client-s3").S3Client>;
  constructor(private bucket: string) {
    this.clientPromise = import("@aws-sdk/client-s3").then(
      ({ S3Client }) =>
        new S3Client({
          region: env().S3_REGION,
          endpoint: env().S3_ENDPOINT,
          forcePathStyle: Boolean(env().S3_ENDPOINT),
          credentials: { accessKeyId: env().S3_ACCESS_KEY_ID ?? "", secretAccessKey: env().S3_SECRET_ACCESS_KEY ?? "" },
        }),
    );
  }
  async put(key: string, body: Buffer, contentType: string) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.clientPromise).send(new PutObjectCommand({ Bucket: this.bucket, Key: safeKey(key), Body: body, ContentType: contentType }));
  }
  async get(key: string) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const res = await (await this.clientPromise).send(new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
      return res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.clientPromise).send(new DeleteObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }));
  }
  async signedUrl(key: string, expiresSeconds: number) {
    const [{ GetObjectCommand }, { getSignedUrl }] = await Promise.all([import("@aws-sdk/client-s3"), import("@aws-sdk/s3-request-presigner")]);
    return getSignedUrl(await this.clientPromise, new GetObjectCommand({ Bucket: this.bucket, Key: safeKey(key) }), { expiresIn: expiresSeconds });
  }
}

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (driver) return driver;
  const e = env();
  if (e.STORAGE_DRIVER === "s3") {
    if (!e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY) throw new Error("S3 storage selected but S3_* variables are incomplete");
    driver = new S3Storage(e.S3_BUCKET);
  } else {
    driver = new LocalStorage(e.LOCAL_STORAGE_DIR);
  }
  return driver;
}

/** Test hook */
export function setStorageDriver(d: StorageDriver | null) {
  driver = d;
}
