import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { thumbKey } from "@/lib/storage/uploads";

/**
 * Serves stored files. Public product media is cacheable by anyone; private uploads
 * (sell and repair submissions) are only served to their owner and staff.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await prisma.storedFile.findUnique({
    where: { id },
    include: { enquiryMedia: { include: { enquiry: { select: { userId: true } } } }, repairMedia: { include: { repair: { select: { userId: true } } } }, productMedia: { include: { product: { select: { status: true, publishedAt: true } } } } },
  });
  if (!file) return new NextResponse("Not found", { status: 404 });

  let publicAccess = file.isPublic;
  // Product media for unpublished products stays private to staff.
  if (file.productMedia && !file.productMedia.product.publishedAt) publicAccess = false;
  if (!publicAccess) {
    const user = await getCurrentUser();
    const ownerId = file.enquiryMedia?.enquiry.userId ?? file.repairMedia?.repair.userId ?? file.ownerUserId;
    const allowed = user && (isStaff(user.role) || (ownerId && ownerId === user.id));
    if (!allowed) return new NextResponse("Not found", { status: 404 });
  }

  const variant = new URL(req.url).searchParams.get("v");
  const key = variant === "thumb" && file.kind === "IMAGE" ? thumbKey(file.storageKey) : file.storageKey;
  const body = (await storage().get(key)) ?? (key !== file.storageKey ? await storage().get(file.storageKey) : null);
  if (!body) return new NextResponse("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": file.mimeType,
    "Content-Length": String(body.length),
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
    "Cache-Control": publicAccess ? "public, max-age=31536000, immutable" : "private, no-store",
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'",
  };

  // Support byte ranges so videos can be scrubbed.
  const range = req.headers.get("range");
  if (range && file.kind === "VIDEO") {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Math.min(Number(m[2]), body.length - 1) : body.length - 1;
      if (start <= end && start < body.length) {
        return new NextResponse(new Uint8Array(body.subarray(start, end + 1)), {
          status: 206,
          headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${body.length}`, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" },
        });
      }
    }
  }
  return new NextResponse(new Uint8Array(body), { headers: { ...headers, "Accept-Ranges": "bytes" } });
}
