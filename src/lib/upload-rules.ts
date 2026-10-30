// File types and sizes customers may upload with seller and repair requests.
// The private storage bucket enforces the same limits (see the security migration).

export const ALLOWED_UPLOADS = {
  'image/jpeg': { ext: 'jpg', maxBytes: 10 * 1024 * 1024, video: false },
  'image/png': { ext: 'png', maxBytes: 10 * 1024 * 1024, video: false },
  'image/webp': { ext: 'webp', maxBytes: 10 * 1024 * 1024, video: false },
  'image/heic': { ext: 'heic', maxBytes: 10 * 1024 * 1024, video: false },
  'image/heif': { ext: 'heif', maxBytes: 10 * 1024 * 1024, video: false },
  'video/mp4': { ext: 'mp4', maxBytes: 25 * 1024 * 1024, video: true },
  'video/quicktime': { ext: 'mov', maxBytes: 25 * 1024 * 1024, video: true },
  'video/webm': { ext: 'webm', maxBytes: 25 * 1024 * 1024, video: true },
} as const;

export const MAX_FILES = 8;

export type UploadMeta = { name: string; type: string; size: number };
export type UploadTarget = { path: string; token: string; type: string };
