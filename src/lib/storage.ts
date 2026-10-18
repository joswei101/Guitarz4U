import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { env } from "./env";

// Two "buckets": public (product photos) and private (seller & repair photos,
// only served to the owner of the record and administrators).
export type Bucket = "public" | "private";

let s3: S3Client | null = null;
function client() {
  if (!s3) {
    s3 = new S3Client({
      endpoint: env.s3.endpoint,
      region: env.s3.region,
      forcePathStyle: true, // required by Supabase Storage's S3 endpoint
      credentials: { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey },
    });
  }
  return s3;
}
const bucketName = (b: Bucket) => (b === "public" ? env.s3.publicBucket : env.s3.privateBucket);

const LOCAL_ROOT = path.join(process.cwd(), "uploads");
function localPath(bucket: Bucket, key: string) {
  const p = path.join(LOCAL_ROOT, bucket, key);
  if (!p.startsWith(path.join(LOCAL_ROOT, bucket) + path.sep)) throw new Error("Invalid storage key");
  return p;
}

export async function putObject(bucket: Bucket, key: string, body: Buffer, contentType: string) {
  if (env.storageDriver === "s3") {
    await client().send(
      new PutObjectCommand({
        Bucket: bucketName(bucket),
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: bucket === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
      }),
    );
    return;
  }
  const p = localPath(bucket, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
}

export async function getObject(bucket: Bucket, key: string): Promise<Buffer | null> {
  try {
    if (env.storageDriver === "s3") {
      const res = await client().send(new GetObjectCommand({ Bucket: bucketName(bucket), Key: key }));
      if (!res.Body) return null;
      return Buffer.from(await res.Body.transformToByteArray());
    }
    return await fs.readFile(localPath(bucket, key));
  } catch {
    return null;
  }
}

export async function deleteObject(bucket: Bucket, key: string) {
  try {
    if (env.storageDriver === "s3") {
      await client().send(new DeleteObjectCommand({ Bucket: bucketName(bucket), Key: key }));
    } else {
      await fs.unlink(localPath(bucket, key));
    }
  } catch (err) {
    console.error("[storage] delete failed", key, err);
  }
}

/** Public URL for a product image. Uses the storage CDN when configured. */
export function publicImageUrl(key: string): string {
  if (env.storageDriver === "s3" && env.s3.publicUrl) return `${env.s3.publicUrl}/${key}`;
  return `/media/${key}`;
}
