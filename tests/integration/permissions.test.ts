import { describe, expect, it } from "vitest";
import { can, PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/auth/guards";
import { updateProductAction, setProductStatusAction } from "@/app/actions/admin/products";
import { moderateReviewAction } from "@/app/actions/admin/misc";
import { prisma } from "@/lib/db";
import { GET as exportGet } from "@/app/api/admin/export/[kind]/route";
import { loginAs, makeProduct, makeUser } from "../helpers/factories";

describe("role-based permissions (server-side)", () => {
  it("customers have no admin permissions", () => {
    for (const p of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) expect(can("CUSTOMER", p)).toBe(false);
  });

  it("content managers can edit content but not prices, orders, finances or reviews", () => {
    expect(can("CONTENT_MANAGER", "inventory:edit-content")).toBe(true);
    expect(can("CONTENT_MANAGER", "content:draft")).toBe(true);
    for (const p of ["inventory:edit-pricing", "inventory:change-status", "orders:manage", "finance:view", "reviews:moderate", "content:publish", "refunds:manage"] as const) expect(can("CONTENT_MANAGER", p)).toBe(false);
  });

  it("requirePermission rejects anonymous users and customers", async () => {
    await expect(requirePermission("orders:manage")).rejects.toThrow(/sign in/i);
    const c = await makeUser();
    await loginAs(c.id);
    await expect(requirePermission("orders:manage")).rejects.toThrow(/permission/);
  });

  it("a customer calling an admin action directly is refused", async () => {
    const p = await makeProduct({ status: "DRAFT" });
    const c = await makeUser();
    await loginAs(c.id);
    const form = new FormData();
    form.set("id", p.id);
    form.set("status", "AVAILABLE");
    const res = await setProductStatusAction(null, form);
    expect(res.ok).toBe(false);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("DRAFT");
    const review = new FormData();
    review.set("id", "x");
    review.set("status", "APPROVED");
    await expect(moderateReviewAction(review)).rejects.toThrow(/permission/);
  });

  it("a content manager cannot change prices even by submitting price fields", async () => {
    const p = await makeProduct({ price: 500000 });
    const cm = await makeUser({ role: "CONTENT_MANAGER" });
    await loginAs(cm.id);
    const form = new FormData();
    for (const [k, v] of Object.entries({ id: p.id, title: "New title here", brand: "Fender", model: "Strat", categoryId: p.categoryId, description: "Updated description text", condition: "GOOD", conditionNotes: "Fine", price: "1.00", acquisitionCost: "0" })) form.set(k, v);
    const res = await updateProductAction(null, form);
    expect(res.ok).toBe(true);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.title).toBe("New title here");
    expect(after.priceCents).toBe(500000);
    expect(after.acquisitionCostCents).toBe(400000);
  });

  it("financial CSV exports are not available to customers or content managers", async () => {
    const cm = await makeUser({ role: "CONTENT_MANAGER" });
    await loginAs(cm.id);
    const res = await exportGet(new Request("http://localhost:3000/api/admin/export/payments"), { params: Promise.resolve({ kind: "payments" }) });
    expect(res.status).toBe(404);
    const admin = await makeUser({ role: "ADMIN" });
    await loginAs(admin.id);
    const ok = await exportGet(new Request("http://localhost:3000/api/admin/export/payments"), { params: Promise.resolve({ kind: "payments" }) });
    expect(ok.status).toBe(200);
    expect(await ok.text()).toMatch(/^type,date,reference/);
  });
});
