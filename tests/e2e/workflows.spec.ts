import { expect, test } from "@playwright/test";
import { createProductViaDb, createUser, FIXTURE_IMAGE, firstLink, login, PASSWORD, runId, sql, waitForEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

let adminEmail: string;
let customerEmail: string;

test.beforeAll(async () => {
  adminEmail = await createUser("owner", { admin: true });
  customerEmail = await createUser("buyer");
});

test("registration with email verification, then sign in", async ({ page }) => {
  const email = `newcustomer-${runId}@test.local`;
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Thandi Nkosi");
  await page.getByLabel("Email address").fill(email);
  await page.locator("input[name=password]").fill("weak");
  await page.locator("input[name=confirm]").fill("weak");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 8 characters")).toBeVisible();
  await expect(page.getByText("Please accept the privacy policy and terms")).toBeVisible();

  await page.locator("input[name=password]").fill(PASSWORD);
  await page.locator("input[name=confirm]").fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  // Not confirmed yet → cannot sign in
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.locator("input[name=password]").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/confirm your email address/i)).toBeVisible();

  const mail = await waitForEmail(email, /confirm/i);
  await page.goto(firstLink(mail.Text || mail.HTML));
  await page.waitForURL(/\/account/);
  await expect(page.getByRole("heading", { name: /Hello, Thandi/ })).toBeVisible();
  // sign out works
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("/");
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
});

test("password reset by email", async ({ page }) => {
  const email = await createUser("forgetful");
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a reset link" }).click();
  await expect(page.getByText(/If an account exists/)).toBeVisible();
  const mail = await waitForEmail(email, /reset/i);
  await page.goto(firstLink(mail.Text || mail.HTML));
  await page.waitForURL(/\/reset-password/);
  await page.locator("input[name=password]").fill("Brand-new-pass-9");
  await page.locator("input[name=confirm]").fill("Brand-new-pass-9");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Your password has been updated.")).toBeVisible();
  await login(page, email, "Brand-new-pass-9");
});

test("admin area is hidden from customers and signed-out visitors", async ({ page, request }) => {
  const anon = await request.get("/admin", { maxRedirects: 0 });
  expect(anon.status()).toBe(307);
  await login(page, customerEmail);
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
  const csv = await page.goto("/admin/exports/customers");
  expect(csv?.status()).toBe(404);
});

test("admin adds a product with photos and publishes it", async ({ page }) => {
  await login(page, adminEmail, PASSWORD, "/admin");
  await page.goto("/admin/catalogue");
  await page.getByPlaceholder("Brand name").first().fill(`Brandname${runId}`);
  await page.getByRole("button", { name: "Add brand" }).click();
  await expect(page.getByText("Brand saved.")).toBeVisible();

  await page.goto("/admin/products/new");
  await page.locator("input[name=title]").fill(`E2E Les Paul ${runId}`);
  await page.getByLabel("Brand").selectOption({ label: `Brandname${runId}` });
  await page.getByLabel("Model").fill("Standard");
  await page.getByLabel("Category").selectOption({ label: "Electric guitars" });
  await page.getByLabel("Condition").selectOption("excellent");
  await page.locator("input[name=price]").fill("15500");
  await page.locator("textarea[name=description]").fill("A lovely single-cut with a carved maple top.");
  await page.getByLabel("Defects & damage (shown to customers)").fill("Small ding on the back.");
  await page.getByLabel("Serial number").fill("SERIAL-PRIVATE-999");
  await page.getByRole("button", { name: "Create product" }).click();
  await page.waitForURL(/\/admin\/products\/[0-9a-f-]+\?created=1/);
  await expect(page.getByText(/Product created as draft/)).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles([FIXTURE_IMAGE, FIXTURE_IMAGE]);
  await page.getByRole("button", { name: "Upload 2 photos" }).click();
  await expect(page.getByText("Photos uploaded.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Move photo down" })).toHaveCount(2);
  await page.getByRole("button", { name: "Move photo down" }).first().click();
  await expect(page.getByText(/Order saved/)).toBeVisible();

  await page.getByLabel("Status").selectOption("published");
  await page.getByLabel("Feature on the home page").check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Product saved.")).toBeVisible();

  // Public page shows it, without the private serial number
  await page.goto("/");
  await expect(page.getByRole("link", { name: `E2E Les Paul ${runId}` }).first()).toBeVisible();
  await page.getByRole("link", { name: `E2E Les Paul ${runId}` }).first().click();
  await expect(page.getByText("Small ding on the back.")).toBeVisible();
  await expect(page.getByText("SERIAL-PRIVATE-999")).toHaveCount(0);
  const img = page.locator('img[src*="/storage/v1/object/public/product-images/"]').first();
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
});

test("customer: wishlist, request cart and purchase request; admin responds", async ({ page }) => {
  const product = await createProductViaDb(`Cart Strat ${runId}`, { price: 6200 });
  await login(page, customerEmail, PASSWORD, "/account");
  await page.goto(`/shop/${product.slug}`);
  await page.getByRole("button", { name: "Add to wishlist" }).click();
  await expect(page.getByText("Saved to your wishlist.")).toBeVisible();
  await page.getByRole("button", { name: "Add to request cart" }).click();
  await expect(page.getByRole("link", { name: /Request cart, 1 item/ })).toBeVisible();
  await page.goto("/account/wishlist");
  await expect(page.getByRole("link", { name: `Cart Strat ${runId}` })).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByText("R 6 200").first()).toBeVisible();
  await expect(page.getByText(/not a checkout/i)).toBeVisible();
  await page.getByLabel("Full name").fill("Buyer Tester");
  await page.getByLabel("Phone / WhatsApp number").fill("082 555 1234");
  await page.getByLabel("Message (optional)").fill("Can I collect on Friday?");
  await page.getByRole("button", { name: /Submit purchase request/ }).click();
  await page.waitForURL(/\/account\/requests\/.+\?submitted=1/);
  await expect(
    page.getByText("Your request is not a completed purchase, and no payment has been taken.", { exact: false }),
  ).toBeVisible();
  const reference = (await page.getByRole("heading", { name: /Purchase request G4U-PR-/ }).textContent())!.replace("Purchase request ", "");
  await expect(page.getByRole("link", { name: /Request cart, 0 items/ })).toBeVisible();

  // Email outbox: admin email actually delivered to the (local) SMTP server and recorded as sent
  const adminMail = await waitForEmail("admin@guitarz4u.local", new RegExp(reference));
  expect(adminMail.Subject).toContain(reference);
  await expect.poll(() => sql(`select email_status from public.notifications where audience='admin' and title like '%${reference}%'`)).toBe("sent");

  // Admin handles it
  await login(page, adminEmail, PASSWORD, "/admin");
  await page.goto(`/admin/requests?q=${reference}`);
  await page.getByRole("link", { name: reference }).click();
  await expect(page.getByText("Can I collect on Friday?")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open WhatsApp chat" })).toHaveAttribute("href", /wa\.me\/27825551234/);
  await page.getByLabel("Status").selectOption("awaiting_payment");
  await page.getByLabel(/Message to the customer/).fill("Available! Please pay by EFT using your reference.");
  await page.getByRole("button", { name: /Save & notify customer/ }).click();
  await expect(page.getByText(/Saved\. The customer can see the update/)).toBeVisible();

  // Customer sees update + notification
  await login(page, customerEmail);
  await expect(page.getByRole("link", { name: /Notifications\s*\d+/ })).toBeVisible();
  await page.goto("/account/notifications");
  await expect(page.getByText(`Purchase request ${reference} updated`)).toBeVisible();
  await page.getByRole("link", { name: "View details" }).first().click();
  await expect(page.getByText("Available! Please pay by EFT using your reference.")).toBeVisible();
  await expect(page.getByText("Awaiting payment").first()).toBeVisible();
});

test("reservation request → admin approval → item shown as reserved", async ({ page }) => {
  const product = await createProductViaDb(`Reserve Tele ${runId}`, { price: 8100 });
  await login(page, customerEmail);
  await page.goto(`/shop/${product.slug}`);
  await page.getByRole("link", { name: "Request a reservation" }).click();
  await page.getByLabel("Phone / WhatsApp number").fill("082 555 1234");
  await page.getByRole("button", { name: "Send reservation request" }).click();
  await page.waitForURL(/\/account\/reservations\/.+\?submitted=1/);
  await expect(page.getByText("This is a request, not a confirmed reservation.", { exact: false })).toBeVisible();
  const url = page.url();
  const id = url.split("/").pop()!.split("?")[0];

  await login(page, adminEmail, PASSWORD, "/admin");
  await page.goto(`/admin/reservations/${id}`);
  await page.getByLabel("Hold for (days)").fill("2");
  await page.getByRole("button", { name: "Approve reservation" }).click();
  await expect(page.getByText(/Reservation approved/)).toBeVisible();

  await page.goto(`/shop/${product.slug}`);
  await expect(page.getByText("Currently reserved")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to request cart" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Notify me/ })).toBeVisible();
});

test("seller submission with photos → offer → seller accepts", async ({ page }) => {
  await login(page, customerEmail, PASSWORD, "/account");
  await page.goto("/sell");
  await page.getByLabel("Phone / WhatsApp number").fill("082 555 1234");
  await page.getByLabel("Brand").fill("Ibanez");
  await page.getByLabel("Model").fill(`RG ${runId}`);
  await page.getByLabel("Guitar type").selectOption({ label: "Electric guitars" });
  await page.getByLabel("Condition").selectOption("fair");
  await page.getByLabel("No, it's broken").check();
  await page.getByLabel("Defects or damage").fill("Output jack is loose and the neck pickup is dead.");
  await page.getByLabel("Asking price (R, optional)").fill("2500");
  await page.locator('input[type="file"]').setInputFiles([FIXTURE_IMAGE]);
  await page.getByRole("button", { name: "Submit my guitar" }).click();
  await expect(page.getByText("Please confirm this is a complete guitar")).toBeVisible();
  await page.getByLabel(/This is a complete guitar/).check();
  await page.getByLabel(/I agree that Guitarz4U may use these details/).check();
  await page.getByRole("button", { name: "Submit my guitar" }).click();
  await page.waitForURL(/\/account\/submissions\/.+\?submitted=1/, { timeout: 30_000 });
  await expect(page.getByText("Thank you — your guitar has been submitted")).toBeVisible();
  await expect(page.locator('img[alt^="Ibanez RG"]')).toHaveCount(1);
  const id = page.url().split("/").pop()!.split("?")[0];

  await login(page, adminEmail, PASSWORD, "/admin");
  await page.goto(`/admin/submissions/${id}`);
  await expect(page.locator('img[alt^="Ibanez RG"]')).toHaveCount(1);
  await page.getByLabel("Offer amount (R)").fill("1800");
  await page.getByLabel("Message with the offer").fill("Subject to inspection.");
  await page.getByRole("button", { name: "Send offer" }).click();
  await expect(page.getByText(/Offer sent/)).toBeVisible();

  await login(page, customerEmail);
  await page.goto(`/account/submissions/${id}`);
  await expect(page.getByRole("heading", { name: "Offer from Guitarz4U: R 1 800" })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Accept offer" }).click();
  await expect(page.getByText(/Offer accepted — we'll contact you/)).toBeVisible();
  await page.reload();
  await expect(page.getByText("Offer accepted").first()).toBeVisible();
});

test("repair booking → quote → customer accepts (work not started automatically)", async ({ page }) => {
  await login(page, customerEmail);
  await page.goto("/repairs");
  await page.getByLabel("Phone / WhatsApp number").fill("082 555 1234");
  await page.getByLabel("Guitar type").selectOption("acoustic");
  await page.getByLabel(/Guitar setup/).check();
  await page.getByLabel("Describe the problem").fill("Strings buzz on the first three frets.");
  await page.getByLabel(/I agree that Guitarz4U may use these details to assess my repair/).check();
  await page.locator('input[type="file"]').setInputFiles([FIXTURE_IMAGE]);
  await page.getByRole("button", { name: "Send repair request" }).click();
  await page.waitForURL(/\/account\/repairs\/.+\?submitted=1/, { timeout: 30_000 });
  const id = page.url().split("/").pop()!.split("?")[0];

  await login(page, adminEmail, PASSWORD, "/admin");
  await page.goto(`/admin/repairs/${id}`);
  await page.getByLabel("Quote amount (R)").fill("750");
  await page.getByLabel("Quote details").fill("Full setup incl. new strings.");
  await page.getByLabel("Status").selectOption("quote_provided");
  await page.getByRole("button", { name: /Save & notify customer/ }).click();
  await expect(page.getByText(/Saved\./)).toBeVisible();

  await login(page, customerEmail);
  await page.goto(`/account/repairs/${id}`);
  await expect(page.getByRole("heading", { name: "Quotation: R 750" })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Accept quote" }).click();
  await expect(page.getByText(/Quote accepted/).first()).toBeVisible();
  expect(sql(`select status from public.repair_bookings where id='${id}'`)).toBe("awaiting_review");
});

test("reviews are moderated before publication", async ({ page }) => {
  await login(page, customerEmail);
  await page.goto("/account/reviews");
  await page.getByRole("radio", { name: "4 stars" }).check({ force: true });
  await page.getByLabel("Display name").fill(`Buyer${runId}`);
  await page.getByLabel("Your review").fill("Honest description and quick replies on WhatsApp. Very happy.");
  await page.getByRole("button", { name: "Submit review" }).click();
  await expect(page.getByText(/will appear once it has been approved/)).toBeVisible();
  await page.goto("/reviews");
  await expect(page.getByText(`Buyer${runId}`)).toHaveCount(0);

  await login(page, adminEmail, PASSWORD, "/admin");
  await page.goto("/admin/reviews");
  const card = page.locator("li", { hasText: `Buyer${runId}` });
  await card.getByRole("button", { name: /Approve/ }).click();
  await expect(card).toHaveCount(0); // leaves the pending list once approved
  await page.goto("/reviews");
  await expect(page.getByText(new RegExp(`Buyer${runId}`))).toBeVisible();
});

test("customer data export and admin CSV export", async ({ page }) => {
  await login(page, customerEmail);
  const res = await page.request.get("/account/export");
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  expect(data.account.email).toBe(customerEmail);
  expect(data.purchase_requests.length).toBeGreaterThan(0);

  await login(page, adminEmail, PASSWORD, "/admin");
  const csv = await page.request.get("/admin/exports/purchase-requests");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("Buyer Tester");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.goto("/admin/audit");
  await expect(page.getByText(adminEmail).first()).toBeVisible();
});
