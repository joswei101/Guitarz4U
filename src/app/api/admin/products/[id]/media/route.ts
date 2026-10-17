import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertSameOrigin, ipFromRequest, jsonError } from "@/lib/http";
import { requirePermission } from "@/lib/auth/guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { collectFiles, storeUploads } from "@/lib/storage/uploads";
import { audit } from "@/lib/audit";

/** Staff upload of product photos/videos (public once the product is published). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const user = await requirePermission("inventory:edit-content");
    await enforceRateLimit(`admin-upload:${user.id}:${ipFromRequest(req)}`, 60, 3600);
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id }, include: { _count: { select: { media: true } } } });
    if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
    const form = await req.formData();
    const files = [...collectFiles(form, "photos"), ...collectFiles(form, "video")];
    if (!files.length) return NextResponse.json({ ok: false, error: "Choose at least one file." }, { status: 400 });
    if (product._count.media + files.length > 20) return NextResponse.json({ ok: false, error: "A product can have at most 20 photos/videos." }, { status: 400 });
    const ids = await storeUploads(files, { isPublic: true, ownerUserId: user.id, prefix: "products" });
    await prisma.productMedia.createMany({ data: ids.map((fileId, i) => ({ productId: id, fileId, sortOrder: product._count.media + i, altText: product.title })) });
    await audit({ actorId: user.id, action: "product.media_uploaded", entityType: "Product", entityId: id, details: { count: ids.length } });
    return NextResponse.json({ ok: true, reference: String(ids.length) });
  } catch (err) {
    return jsonError(err);
  }
}
