import sharp, { type OutputInfo } from "sharp";
import type { MediaKind } from "@prisma/client";
import { prisma, type Tx } from "../db";
import { randomToken } from "../crypto";
import { UserError } from "../errors";
import { storage } from "./index";

export const UPLOAD_LIMITS = {
  imageMaxBytes: 10 * 1024 * 1024,
  videoMaxBytes: 50 * 1024 * 1024,
  maxImagesPerSubmission: 8,
  maxVideosPerSubmission: 1,
  imageTypes: ["image/jpeg", "image/png", "image/webp"],
  videoTypes: ["video/mp4", "video/quicktime", "video/webm"],
} as const;

/** Identifies a file by its content ("magic bytes"), never trusting the browser-supplied type or extension. */
export function sniffType(buf: Buffer): { kind: MediaKind; mime: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: "IMAGE", mime: "image/jpeg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { kind: "IMAGE", mime: "image/png" };
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { kind: "IMAGE", mime: "image/webp" };
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "qt  ") return { kind: "VIDEO", mime: "video/quicktime" };
    if (/^(isom|iso2|iso5|iso6|mp41|mp42|avc1|M4V |MSNV|dash|3gp\d)$/.test(brand)) return { kind: "VIDEO", mime: "video/mp4" };
    return null;
  }
  if (buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return { kind: "VIDEO", mime: "video/webm" };
  return null;
}

export interface UploadOptions {
  isPublic: boolean;
  ownerUserId?: string | null;
  prefix: "products" | "enquiries" | "repairs";
}

/** Splits form files into validated images and videos and enforces count/size limits. */
export function collectFiles(form: FormData, field: string): File[] {
  return form.getAll(field).filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f && (f as File).size > 0);
}

/**
 * Validates and stores uploaded files. Images are decoded and re-encoded to WebP, which strips
 * EXIF metadata (including GPS location) and neutralises malformed or disguised files.
 */
export async function storeUploads(files: File[], opts: UploadOptions, tx: Tx | typeof prisma = prisma): Promise<string[]> {
  let images = 0;
  let videos = 0;
  const prepared: { key: string; body: Buffer; mime: string; kind: MediaKind; width?: number; height?: number; thumb?: Buffer; name: string }[] = [];

  for (const file of files) {
    if (file.size > UPLOAD_LIMITS.videoMaxBytes) throw new UserError(`"${file.name}" is too large. Videos may be up to 50 MB and photos up to 10 MB.`);
    const buf = Buffer.from(await file.arrayBuffer());
    const type = sniffType(buf);
    if (!type) throw new UserError(`"${file.name}" is not a supported file. Please upload JPEG, PNG or WebP photos, or MP4, MOV or WebM video.`);
    const base = `${opts.prefix}/${new Date().toISOString().slice(0, 7)}/${randomToken(18)}`;

    if (type.kind === "IMAGE") {
      if (++images > UPLOAD_LIMITS.maxImagesPerSubmission) throw new UserError(`Please upload at most ${UPLOAD_LIMITS.maxImagesPerSubmission} photos.`);
      if (buf.length > UPLOAD_LIMITS.imageMaxBytes) throw new UserError(`"${file.name}" is larger than 10 MB.`);
      let full: { data: Buffer; info: OutputInfo };
      let thumb: Buffer;
      try {
        const img = sharp(buf, { limitInputPixels: 50_000_000 }).rotate();
        full = await img.clone().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
        thumb = await img.clone().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      } catch {
        throw new UserError(`"${file.name}" could not be read as an image.`);
      }
      prepared.push({ key: `${base}.webp`, body: full.data, mime: "image/webp", kind: "IMAGE", width: full.info.width, height: full.info.height, thumb, name: file.name });
    } else {
      if (++videos > UPLOAD_LIMITS.maxVideosPerSubmission) throw new UserError("Please upload only one video.");
      const ext = type.mime === "video/webm" ? "webm" : type.mime === "video/quicktime" ? "mov" : "mp4";
      prepared.push({ key: `${base}.${ext}`, body: buf, mime: type.mime, kind: "VIDEO", name: file.name });
    }
  }

  const ids: string[] = [];
  for (const p of prepared) {
    await storage().put(p.key, p.body, p.mime);
    if (p.thumb) await storage().put(thumbKey(p.key), p.thumb, "image/webp");
    const rec = await tx.storedFile.create({
      data: {
        storageKey: p.key,
        kind: p.kind,
        mimeType: p.mime,
        sizeBytes: p.body.length,
        width: p.width,
        height: p.height,
        isPublic: opts.isPublic,
        ownerUserId: opts.ownerUserId ?? null,
        originalName: p.name.slice(0, 200),
      },
    });
    ids.push(rec.id);
  }
  return ids;
}

export function thumbKey(key: string): string {
  return key.replace(/\.webp$/, "_thumb.webp");
}

export function fileUrl(id: string, variant?: "thumb"): string {
  return `/api/files/${id}${variant ? `?v=${variant}` : ""}`;
}
