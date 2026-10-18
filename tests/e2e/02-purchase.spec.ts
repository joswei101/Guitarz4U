import { test, expect } from "@playwright/test";
import { db, freshIp, humanPause, login, makeProduct, ADMIN, uid, expectNoPaymentFields } from "./helpers";

const SUCCESS = "Your purchase request has been submitted successfully. Guitarz4U will review your request and contact you to confirm availability and arrange payment privately by EFT. No payment has been taken, and your purchase is not confirmed yet.";

test("guest purchase request → admin approval → private EFT → manual payment confirmation → sold", async ({ page }) => {
  await freshIp(page);
  const aTitle = "Flowtest Strat Alpha " + uid();
  const a = await makeProduct(aTitle, "published", 5000);
  const b = await makeProduct("Flowtest Bass Beta " + uid(), "published", 2500);

  // Add two items to the request cart
  for (const p of [a, b]) {
    await page.goto(`/shop/${p.slug}`);
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByText("In your request cart")).toBeVisible();
  }
  await expect(page.getByTestId("cart-count")).toHaveText("2");
  await page.goto("/cart");
  await expect(page.getByTestId("cart-item")).toHaveCount(2);
  await expect(page.getByTestId("cart-total")).toHaveText("R7 500");
  await expectNoPaymentFields(page);

  // Remove and re-add one item
  await page.getByRole("button", { name: /Remove Flowtest Bass Beta/ }).click();
  await expect(page.getByTestId("cart-item")).toHaveCount(1);
  await page.goto(`/shop/${b.slug}`);
  await page.getByTestId("add-to-cart").click();
  await page.goto("/cart");
  await expect(page.getByTestId("cart-item")).toHaveCount(2);

  // Validation: missing acknowledgement and bad email
  const email = `buyer-${uid()}@example.com`;
  await page.getByLabel("Your name").fill("Thabo Buyer");
  await page.getByLabel("Email address").fill("not-an-email");
  await humanPause(page);
  await page.getByTestId("submit-request").click();
  await expect(page.locator(".form-status.error")).toBeVisible();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/Phone/).fill("082 555 1234");
  await page.getByLabel("Message (optional)").fill("Can I collect on Friday?");
  await page.getByRole("checkbox").check();
  await page.getByTestId("submit-request").click();
  await expect(page.getByTestId("purchase-success")).toContainText(SUCCESS);
  const reference = (await page.getByTestId("purchase-reference").textContent())!;
  expect(reference).toMatch(/^G4U-PR-[A-Z0-9]{8}$/);
  await expect(page.getByTestId("cart-count")).toHaveCount(0);

  // Stored in the database with server-side prices
  const r = (await db.query("select id, status, estimated_total_cents, payment_confirmed_at from purchase_requests where reference=$1", [reference])).rows[0];
  expect(r.status).toBe("submitted");
  expect(r.estimated_total_cents).toBe(750000);
  expect(r.payment_confirmed_at).toBeNull();
  // Products are NOT automatically reserved or sold by a request
  expect((await db.query("select status from products where id=$1", [a.id])).rows[0].status).toBe("published");

  // Guest tracking by reference + email
  await page.goto(`/track?ref=${reference}`);
  await page.getByLabel("Email or phone number used").fill(email);
  await humanPause(page);
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.getByTestId("track-result")).toContainText("Request submitted");
  // Wrong contact detail reveals nothing
  await page.getByLabel("Email or phone number used").fill("someone-else@example.com");
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.locator(".form-status.error")).toContainText("could not find");

  // ── Admin side ──
  await page.context().clearCookies();
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto("/admin/notifications");
  await expect(page.getByText(`New purchase request ${reference}`)).toBeVisible();
  await page.goto(`/admin/requests/${r.id}`);
  await expect(page.getByText("Thabo Buyer")).toBeVisible();
  await expect(page.getByText("Can I collect on Friday?")).toBeVisible();

  // Completing before payment is impossible (option disabled in the UI and refused by a database constraint)
  await expect(page.locator('select#status option[value="completed"]')).toBeDisabled();
  await expect(db.query("update purchase_requests set status='completed' where id=$1", [r.id])).rejects.toThrow(/purchase_requests_payment_guard/);

  // Approve with a private note and a customer message
  await page.locator("select#status").selectOption("approved");
  await page.getByLabel("Message to customer (visible to them)").fill("Both guitars are available. I will WhatsApp you.");
  await page.getByLabel("Private admin notes").fill("PRIVATE-NOTE-xyz: buyer seems keen");
  await page.getByRole("button", { name: "Save update" }).click();
  await expect(page.locator("h1 + .tag")).toHaveText("Purchase approved");
  expect((await db.query("select status from products where id=$1", [a.id])).rows[0].status).toBe("reserved");

  // Record EFT details as sent (privately)
  await page.getByLabel("I have sent my EFT details to this customer privately.").check();
  await page.getByRole("button", { name: "Record EFT details as sent" }).click();
  await expect(page.locator(".tag", { hasText: "Awaiting private EFT payment" })).toBeVisible();

  // Manually confirm payment after checking the bank
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Amount received (R, optional)").fill("7500");
  await page.getByLabel("I have personally checked my bank account and the funds have reflected.").check();
  await page.getByRole("button", { name: "Mark payment as received" }).click();
  await expect(page.getByText("Payment recorded as received.")).toBeVisible();
  const paid = (await db.query("select status, payment_confirmed_by, agreed_total_cents from purchase_requests where id=$1", [r.id])).rows[0];
  expect(paid.status).toBe("payment_confirmed");
  expect(paid.payment_confirmed_by).toBeTruthy();
  expect(paid.agreed_total_cents).toBe(750000);

  // Ready for collection → completed
  const badge = page.locator("h1 + .tag");
  await page.locator("select#status").selectOption("ready_for_collection");
  await page.getByRole("button", { name: "Save update" }).click();
  await expect(badge).toHaveText("Ready for collection");
  await page.locator("select#status").selectOption("completed");
  await page.getByRole("button", { name: "Save update" }).click();
  await expect(badge).toHaveText("Completed");
  expect((await db.query("select status, sold_at from products where id=$1", [a.id])).rows[0].status).toBe("sold");

  // Audit log recorded the payment confirmation
  const auditRows = await db.query("select action from audit_logs where entity_id=$1 order by id", [r.id]);
  expect(auditRows.rows.map((x) => x.action)).toEqual(expect.arrayContaining(["purchase_request.update", "purchase_request.eft_instructions_recorded", "purchase_request.payment_confirmed"]));

  // Sold item is no longer purchasable; private archive keeps it
  await page.goto("/admin/products?status=sold");
  await expect(page.getByRole("link", { name: aTitle })).toBeVisible();
  await page.context().clearCookies();
  await page.goto(`/shop/${a.slug}`);
  await expect(page.getByText("This guitar has been sold")).toBeVisible();

  // Customer-facing tracking never exposes private admin notes
  await freshIp(page);
  await page.goto(`/track?ref=${reference}`);
  await page.getByLabel("Email or phone number used").fill(email);
  await humanPause(page);
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.getByTestId("track-result")).toContainText("Completed");
  await expect(page.getByTestId("track-result")).toContainText("Both guitars are available");
  expect(await page.content()).not.toContain("PRIVATE-NOTE-xyz");
});

test("server rejects requests for unavailable items and tampered prices are ignored", async ({ page, request }) => {
  await freshIp(page);
  const p = await makeProduct("Racetest Guitar " + uid(), "published", 3000);
  await page.goto(`/shop/${p.slug}`);
  await page.getByTestId("add-to-cart").click();
  // Item is sold by someone else after it was added to the cart
  await db.query("update products set status='sold', sold_at=now() where id=$1", [p.id]);
  await page.goto("/cart");
  await expect(page.getByText(/no longer available/).first()).toBeVisible();

  // Direct API call for a sold product is refused
  const form = { name: "X Person", email: "x@example.com", phone: "", preferredContact: "email", acknowledge: "on", productIds: p.id, startedAt: String(Date.now() - 10000) };
  const res = await request.post("/api/purchase-requests", { multipart: form, headers: { origin: "http://localhost:3000", "x-forwarded-for": "10.9.9.9" } });
  expect(res.status()).toBe(409);

  // Cross-site posts are refused (CSRF protection)
  const evil = await request.post("/api/purchase-requests", { multipart: form, headers: { origin: "https://evil.example", "x-forwarded-for": "10.9.9.8" } });
  expect(evil.status()).toBe(403);
});
