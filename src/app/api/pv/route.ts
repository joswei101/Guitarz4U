import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { ipFromRequest } from "@/lib/http";
import { sha256 } from "@/lib/crypto";

/** Anonymous daily page-view counter. Only the path is stored; the IP is used transiently for abuse limiting. */
export async function POST(req: Request) {
  try {
    const ipKey = sha256(ipFromRequest(req)).slice(0, 16);
    if (!(await rateLimit(`pv:${ipKey}`, 120, 3600))) return new NextResponse(null, { status: 204 });
    const body = (await req.json().catch(() => null)) as { path?: unknown } | null;
    const path = typeof body?.path === "string" ? body.path : "";
    if (!/^\/[a-zA-Z0-9\-_/]{0,150}$/.test(path) || path.startsWith("/admin") || path.startsWith("/api")) return new NextResponse(null, { status: 204 });
    const day = new Date(new Date().toISOString().slice(0, 10));
    await prisma.pageViewDaily.upsert({ where: { day_path: { day, path } }, create: { day, path, views: 1 }, update: { views: { increment: 1 } } });
  } catch {
    /* analytics must never break anything */
  }
  return new NextResponse(null, { status: 204 });
}
