import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { sniffType, storeUploads } from "@/lib/storage/uploads";
import { createRepairRequest } from "@/lib/submissions";
import { GET as fileGet } from "@/app/api/files/[id]/route";
import { toCsv } from "@/lib/csv";
import { jpegFile, loginAs, logout, makeUser } from "../helpers/factories";

const get = (id: string) => fileGet(new Request(`http://localhost/api/files/${id}`), { params: Promise.resolve({ id }) });

describe("secure uploads", () => {
  it("identifies files by content, not by name or declared type", async () => {
    expect(sniffType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))?.mime).toBe("image/jpeg");
    expect(sniffType(Buffer.from("<script>alert(1)</script>"))).toBeNull();
    const disguised = new File([new TextEncoder().encode("<?php echo 'hi'; ?> just text pretending")], "guitar.jpg", { type: "image/jpeg" });
    await expect(storeUploads([disguised], { isPublic: false, prefix: "repairs" })).rejects.toThrow(/not a supported file/);
    const svg = new File([new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')], "x.svg", { type: "image/svg+xml" });
    await expect(storeUploads([svg], { isPublic: false, prefix: "repairs" })).rejects.toThrow(/not a supported file/);
  });

  it("enforces size and count limits", async () => {
    const big = new File([new Uint8Array(51 * 1024 * 1024)], "huge.mp4", { type: "video/mp4" });
    await expect(storeUploads([big], { isPublic: false, prefix: "repairs" })).rejects.toThrow(/too large/);
    const many = await Promise.all(Array.from({ length: 9 }, (_, i) => jpegFile(`p${i}.jpg`)));
    await expect(storeUploads(many, { isPublic: false, prefix: "repairs" })).rejects.toThrow(/at most 8 photos/);
  });

  it("private repair uploads are only served to the owner and staff", async () => {
    const owner = await makeUser({ email: "owner-of-repair@example.com" });
    const f = new FormData();
    for (const [k, v] of Object.entries({ name: "Owner Person", email: "owner-of-repair@example.com", phone: "0711234567", instrumentType: "Bass guitar", problem: "Dead output jack on the bass", privacy: "on" })) f.set(k, v);
    f.append("services", "Jack socket and switch repairs");
    f.append("photos", await jpegFile());
    const r = await createRepairRequest(f, { id: owner.id, email: owner.email, name: owner.name, role: "CUSTOMER", status: "ACTIVE", emailVerifiedAt: new Date(), phone: null });
    const media = await prisma.repairMedia.findFirstOrThrow({ where: { repairId: r.id } });
    logout();
    expect((await get(media.fileId)).status).toBe(404);
    const stranger = await makeUser();
    await loginAs(stranger.id);
    expect((await get(media.fileId)).status).toBe(404);
    await loginAs(owner.id);
    const ok = await get(media.fileId);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toContain("private");
    expect(ok.headers.get("x-content-type-options")).toBe("nosniff");
    const staff = await makeUser({ role: "ADMIN" });
    await loginAs(staff.id);
    expect((await get(media.fileId)).status).toBe(200);
  });
});

describe("CSV exports", () => {
  it("escapes values and neutralises spreadsheet formulas", () => {
    const csv = toCsv(["a", "b"], [["=HYPERLINK(\"x\")", 'He said "hi", then left']]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(`"He said ""hi"", then left"`);
  });
});
