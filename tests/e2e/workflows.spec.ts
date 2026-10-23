import { expect, test } from "@playwright/test";
import { RUN, createProduct, createUser, login, photoFile, service } from "./utils";

test.describe.configure({ mode: "serial" });

const customer = `e2e-flows-${RUN}@example.com`;
const admin = `e2e-flows-admin-${RUN}@example.com`;
let product: { id: string; slug: string };

test.beforeAll(async () => {
  await createUser(customer, "Lerato Dlamini");
  await createUser(admin, "Shop Owner", true);
  product = await createProduct(`E2E reservable guitar ${RUN}`, 3100);
});

test("reservation request and admin approval", async ({ page }) => {
  await login(page, customer, `/shop/${product.slug}`);
  await page.getByText("Request a reservation").click();
  await page.getByRole("button", { name: "Request reservation" }).click();
  await expect(page.getByText(/Reservation request G4U-RS-\d+ received/)).toBeVisible();
  await page.goto("/account/reservations");
  await expect(page.getByText("Awaiting approval")).toBeVisible();

  await page.context().clearCookies();
  await login(page, admin, "/admin/reservations");
  await expect(page.getByText(`E2E reservable guitar ${RUN}`)).toBeVisible();
  await page.getByLabel("New status").first().selectOption({ label: "Approve reservation" });
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText(/Reservation approved/)).toBeVisible();
  const { data } = await service.from("products").select("status").eq("id", product.id).single();
  expect(data!.status).toBe("reserved");

  await page.context().clearCookies();
  await page.goto(`/shop/${product.slug}`);
  await expect(page.getByText("Reserved").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to request cart" })).toHaveCount(0);
});

test("seller submission with photo upload, offer and acceptance", async ({ page }) => {
  await login(page, customer, "/sell");
  await page.getByLabel("Guitar brand").fill("Squier");
  await page.getByLabel("Model").fill("Bullet Strat");
  await page.getByLabel("Category").selectOption({ label: "Electric guitars" });
  await page.getByLabel("Condition").selectOption({ label: "Fair" });
  await page.getByLabel("Does it work?").selectOption({ label: "Partially" });
  await page.getByLabel("Asking price in rand (optional)").fill("1500");
  await page.getByLabel("Faults or damage").fill("Volume pot crackles; one tuner is loose.");
  await page.locator('input[type="file"]').setInputFiles(photoFile("jpg"));
  await expect(page.getByRole("img", { name: "Selected photograph 1" })).toBeVisible();
  await page.getByLabel(/not loose parts/).check();
  await page.getByLabel(/I agree that Guitarz4U may use these details/).check();
  await page.getByRole("button", { name: "Submit my guitar" }).click();
  await expect(page.getByText(/Submission G4U-SL-\d+ received/)).toBeVisible();
  await page.getByRole("link", { name: "Track this submission" }).click();
  await page.waitForURL(/\/account\/selling\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("img", { name: "Uploaded photograph 1" })).toBeVisible();
  const submissionUrl = page.url();
  const submissionId = submissionUrl.split("/").pop()!;

  await page.context().clearCookies();
  await login(page, admin, `/admin/submissions/${submissionId}`);
  await expect(page.getByText("Volume pot crackles; one tuner is loose.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Uploaded photograph 1" })).toBeVisible();
  await page.getByLabel("Offer amount (R)").fill("1200");
  await page.getByLabel("Message to seller (optional)").fill("Happy to collect this week.");
  await page.getByRole("button", { name: "Send offer" }).click();
  await expect(page.getByText(/Offer sent/)).toBeVisible();

  await page.context().clearCookies();
  await login(page, customer, `/account/selling/${submissionId}`);
  await expect(page.getByRole("heading", { name: /Offer from Guitarz4U: R1\s200/ })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Accept offer" }).click();
  await expect(page.getByText(/You accepted the offer of R1\s200/)).toBeVisible();
});

test("repair booking with photo, admin quote, customer acceptance", async ({ page }) => {
  await login(page, customer, "/repairs");
  await page.getByLabel("Your name").fill("Lerato Dlamini");
  await page.getByLabel("Phone / WhatsApp number").fill("083 222 1111");
  await page.getByLabel("Guitar brand").fill("Epiphone");
  await page.getByLabel("Guitar setup and adjustments").check();
  await page.getByLabel("Electronics repairs").check();
  await page.getByLabel("Describe the problem").fill("Buzzing on the low E string and the input jack cuts out.");
  await page.locator('input[type="file"]').setInputFiles(photoFile("png"));
  await expect(page.getByRole("img", { name: "Selected photograph 1" })).toBeVisible();
  await page.getByRole("button", { name: "Request repair booking" }).click();
  await expect(page.getByText(/Booking G4U-RP-\d+ received/)).toBeVisible();
  await expect(page.getByText(/not confirmed yet/).first()).toBeVisible();
  await page.getByRole("link", { name: "Track this repair" }).click();
  await page.waitForURL(/\/account\/repairs\/[0-9a-f-]{36}$/);
  const repairId = page.url().split("/").pop()!;

  await page.context().clearCookies();
  await login(page, admin, `/admin/repairs/${repairId}`);
  await page.getByLabel("Quote amount (R)").fill("650");
  await page.getByLabel("What the quote covers").fill("Full setup plus new output jack.");
  await page.getByRole("button", { name: "Send quote" }).click();
  await expect(page.getByText(/Quote sent/)).toBeVisible();

  await page.context().clearCookies();
  await login(page, customer, `/account/repairs/${repairId}`);
  await expect(page.getByRole("heading", { name: "Quote: R650" })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Accept quote" }).click();
  await expect(page.getByText(/You accepted this quote/)).toBeVisible();

  await page.context().clearCookies();
  await login(page, admin, `/admin/repairs/${repairId}`);
  await page.getByLabel("New status").selectOption({ label: "Approved" });
  await page.getByLabel("Message to customer (visible in their account)").fill("Booked for Tuesday.");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText(/Status updated/)).toBeVisible();
});

test("review submission, moderation and public display", async ({ page }) => {
  const title = `Honest and helpful ${RUN}`;
  await login(page, customer, "/reviews");
  await page.getByRole("radio", { name: "5 stars" }).check({ force: true });
  await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await page.getByLabel("Your review").fill("Quick replies on WhatsApp and the guitar was exactly as described.");
  await page.getByRole("button", { name: "Submit review" }).click();
  await expect(page.getByText(/will appear once it has been approved/)).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/reviews");
  await expect(page.getByText(title)).toHaveCount(0);

  await login(page, admin, "/admin/reviews");
  const card = page.locator("li", { hasText: title });
  await card.getByRole("button", { name: "Approve & publish" }).click();
  await expect(page.locator("li", { hasText: title }).getByText("Published")).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/reviews");
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.locator("article", { hasText: title }).getByText("Verified buyer")).toHaveCount(0);
});

test("guest contact form enquiry reaches the admin", async ({ page }) => {
  const subject = `Do you buy 12-strings? ${RUN}`;
  await page.goto("/contact");
  await page.getByLabel("Your name").fill("Guest Visitor");
  await page.getByLabel("Email").fill("guest@example.com");
  await page.getByLabel("Subject").fill(subject);
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("I have a 12-string acoustic I'd like to sell.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/your message has been received/)).toBeVisible();

  await login(page, admin, "/admin/enquiries");
  await expect(page.getByText(subject)).toBeVisible();
});

test("admin creates a product, uploads a photo, publishes it, and edits site content", async ({ page }) => {
  const title = `E2E Fender Precision ${RUN}`;
  await login(page, admin, "/admin/products/new");
  await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await page.getByRole("combobox", { name: "Brand", exact: true }).fill(`TestBrand${RUN}`);
  await page.getByRole("textbox", { name: "Model", exact: true }).fill("Precision");
  await page.getByLabel("Category").selectOption({ label: "Bass guitars" });
  await page.getByRole("spinbutton", { name: "Price (R)", exact: true }).fill("9500");
  await page.getByLabel("Condition rating").selectOption({ label: "Excellent" });
  await page.getByLabel("Description", { exact: true }).fill("Classic bass in great shape.");
  await page.getByLabel("Disclosed defects and damage").fill("Light scratches on the pickguard.");
  await page.getByLabel("Serial number").fill(`SN-${RUN}`);
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByText("Product created.")).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(photoFile("jpg"));
  await expect(page.getByText("Main photo")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "Publish (available)" }).click();
  await expect(page.getByText("Available").first()).toBeVisible();
  const { data } = await service.from("products").select("slug, status, images:product_images(storage_path)").eq("title", title).single();
  expect(data!.status).toBe("published");
  expect((data!.images as { storage_path: string }[])[0].storage_path).toMatch(/\.(webp|jpg)$/);

  // Public product page shows the uploaded photo and never the serial number.
  await page.context().clearCookies();
  await page.goto(`/shop/${data!.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByText(`SN-${RUN}`)).toHaveCount(0);
  const img = page.locator(`img[src*="/storage/v1/object/public/product-images/"]`).first();
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);

  // Website content editing.
  await login(page, admin, "/admin/content?page=about");
  const body = page.getByLabel("Page text");
  await body.fill(`## Hello from the owner ${RUN}\n\nWe love guitars.`);
  await page.getByRole("button", { name: "Save page" }).click();
  await expect(page.getByText("Page saved.")).toBeVisible();
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: `Hello from the owner ${RUN}` })).toBeVisible();
  await page.goto("/admin/content?page=about");
  await page.getByRole("button", { name: "Reset to default text" }).click();
  await expect(page.getByText("Page reset to the default text.")).toBeVisible();
});

test("admin exports produce CSV and JSON backups", async ({ page, request }) => {
  await login(page, admin, "/admin/exports");
  const cookies = await page.context().cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const csv = await request.get("/admin/exports/purchase-requests", { headers: { cookie: cookieHeader } });
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("reference");
  const sold = await request.get("/admin/exports/sold-products", { headers: { cookie: cookieHeader } });
  expect(sold.status()).toBe(200);
  const backup = await request.get("/admin/exports/backup.json", { headers: { cookie: cookieHeader } });
  expect(backup.status()).toBe(200);
  const json = await backup.json();
  expect(Array.isArray(json.products)).toBe(true);
  expect(Array.isArray(json.audit_logs)).toBe(true);
  // Signed-out visitors are redirected to the login page and never receive data.
  const anonRes = await request.get("/admin/exports/customers", { maxRedirects: 0, headers: { cookie: "" } });
  expect(anonRes.status()).toBe(307);
  expect(anonRes.headers()["location"]).toContain("/login");
});

test("customer data export download contains only their own data", async ({ page, request }) => {
  await login(page, customer, "/account/privacy");
  const cookies = await page.context().cookies();
  const res = await request.get("/account/privacy/export", { headers: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") } });
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.account.email).toBe(customer);
  expect(json.seller_submissions.length).toBeGreaterThanOrEqual(1);
  expect(JSON.stringify(json)).not.toContain("admin_notes");
});
