import { expect, test } from "@playwright/test";
import { PASSWORD, RUN, createProduct, createUser, expectNoPaymentUi, login, service, waitForEmailLink } from "./utils";

test.describe.configure({ mode: "serial" });

const customerEmail = `e2e-customer-${RUN}@example.com`;
const adminEmail = `e2e-admin-${RUN}@example.com`;
let product: { id: string; slug: string };
let requestId = "";

test.beforeAll(async () => {
  await createUser(adminEmail, "Owner Admin", true);
  product = await createProduct(`E2E Yamaha acoustic ${RUN}`, 1850);
});

test("public pages render with key content and no payment UI", async ({ page }) => {
  for (const path of ["/", "/shop", "/sell", "/repairs", "/about", "/how-it-works", "/contact", "/reviews", "/faq", "/policies", "/privacy", "/terms", "/cart", "/login", "/register"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    await expectNoPaymentUi(page);
  }
  await page.goto("/");
  await expect(page.locator("main").getByText(/Second-hand equipment, first-hand service/).first()).toBeVisible();
  await expect(page.getByText("Closed on Saturdays").first()).toBeVisible();
  const notFound = await page.goto("/this-page-does-not-exist");
  expect(notFound?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /out of tune/i })).toBeVisible();
});

test("registration with email verification", async ({ page }) => {
  await page.goto("/register?next=/account");
  await page.getByLabel("Full name").fill("Sipho Ndlovu");
  await page.getByLabel("Email address").fill(customerEmail);
  await page.getByLabel("Phone / WhatsApp (optional)").fill("082 123 4567");
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  // Unverified accounts cannot sign in.
  await page.goto("/login");
  await page.getByLabel("Email address").fill(customerEmail);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/verify your email/i)).toBeVisible();

  const link = await waitForEmailLink(customerEmail, "Confirm your Guitarz4U account");
  await page.goto(link);
  await expect(page).toHaveURL(/\/account\?verified=1/);
  await expect(page.getByText("Your email address has been verified")).toBeVisible();
});

test("search, filters and product page", async ({ page }) => {
  await page.goto(`/shop?q=${encodeURIComponent(`acoustic ${RUN}`)}`);
  await expect(page.getByRole("link", { name: `E2E Yamaha acoustic ${RUN}` }).first()).toBeVisible();
  await page.goto(`/shop?q=${RUN}&max=100`);
  await expect(page.getByText("No guitars match your search")).toBeVisible();
  await page.goto("/shop/category/acoustic");
  await expect(page.getByRole("heading", { name: /Second-hand acoustic guitars/i })).toBeVisible();

  await page.goto(`/shop/${product.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`E2E Yamaha acoustic ${RUN}`);
  await expect(page.getByText(/R1\s850/).first()).toBeVisible();
  await expect(page.getByText("Small ding on the back.")).toBeVisible();
  await expect(page.getByText(/does not process online payments/).first()).toBeVisible();
  await expect(page.getByText(/second-hand instrument/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Ask about this guitar on WhatsApp/ })).toHaveAttribute("href", /wa\.me\/27648567019/);
  await expectNoPaymentUi(page);
});

test("wishlist, cart and purchase request (no payment taken)", async ({ page }) => {
  await login(page, customerEmail, `/shop/${product.slug}`);
  await page.getByRole("button", { name: "Add to wishlist" }).click();
  await expect(page.getByRole("button", { name: "Saved to wishlist" })).toBeVisible();

  await page.getByRole("button", { name: "Add to request cart" }).click();
  await expect(page.getByRole("link", { name: /In your request cart/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Request cart \(1 item\)/ })).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByText(`E2E Yamaha acoustic ${RUN}`)).toBeVisible();
  await expect(page.getByText("Estimated request total (not an invoice)")).toBeVisible();
  await expectNoPaymentUi(page);
  await page.getByLabel("Your name").fill("Sipho Ndlovu");
  await page.getByLabel("Phone / WhatsApp number").fill("082 123 4567");
  await page.getByLabel("Message (optional)").fill("Can I collect on Friday?");
  await page.getByRole("button", { name: "Submit purchase request" }).click();
  // HTML5 validation: the acknowledgement box is required.
  await expect(page.getByText("Purchase request submitted")).toHaveCount(0);
  await page.getByLabel(/I understand that this is a request only/).check();
  await page.getByRole("button", { name: "Submit purchase request" }).click();
  await expect(page.getByRole("heading", { name: "Purchase request submitted" })).toBeVisible();
  await expect(
    page.getByText(
      "Your purchase request has been submitted successfully. Guitarz4U will review your request and contact you to confirm availability and arrange payment privately by EFT. No payment has been taken, and your purchase is not confirmed yet.",
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: "Track this request" }).click();
  await page.waitForURL(/\/account\/requests\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /Request G4U-PR-/ })).toBeVisible();
  await expect(page.getByText("Request submitted").first()).toBeVisible();
  requestId = page.url().split("/").pop()!;

  // Cart is emptied after submission; product still shows as available (not reserved by a request alone).
  await page.goto("/cart");
  await expect(page.getByText("Your request cart is empty")).toBeVisible();
  const { data } = await service.from("products").select("status").eq("id", product.id).single();
  expect(data!.status).toBe("published");
});

test("admin approves, records private EFT, confirms payment manually, completes", async ({ page }) => {
  await login(page, adminEmail, "/admin");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.goto(`/admin/requests/${requestId}`);
  await expect(page.getByText("Sipho Ndlovu").first()).toBeVisible();
  await expect(page.getByText("Can I collect on Friday?")).toBeVisible();
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me\/27821234567/);

  const setStatus = async (label: string, message: string) => {
    await page.getByLabel("New status").selectOption({ label });
    await page.getByLabel("Message to customer (visible in their account)").fill(message);
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText(/Status updated/)).toBeVisible();
    await page.reload();
  };

  await setStatus("Purchase approved", "Good news — it's available.");
  await setStatus("Awaiting private EFT payment", "EFT details sent to you privately on WhatsApp.");

  // Payment confirmation requires the explicit bank-check acknowledgement.
  await page.getByLabel("New status").selectOption({ label: "Payment confirmed by administrator" });
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText(/personally checked your bank account/).first()).toBeVisible();
  await page.getByLabel(/I have personally checked my bank account/).check();
  await page.getByLabel("Private note (admin only)").fill("Checked banking app — funds cleared.");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText(/Status updated/)).toBeVisible();
  await page.reload();
  await expect(page.getByText("Checked banking app — funds cleared.")).toBeVisible();

  await setStatus("Ready for collection", "Collection details sent privately.");
  // Completing closes the request, so the form is replaced by a "closed" notice.
  await page.getByLabel("New status").selectOption({ label: "Completed" });
  await page.getByLabel("Message to customer (visible in their account)").fill("Enjoy your guitar!");
  await page.getByRole("button", { name: "Update status" }).click();
  await expect(page.getByText("This request is closed.")).toBeVisible();
  const { data } = await service.from("products").select("status").eq("id", product.id).single();
  expect(data!.status).toBe("sold");
});

test("customer sees updates, notifications and never the private notes", async ({ page }) => {
  await login(page, customerEmail, `/account/requests/${requestId}`);
  await expect(page.getByText("Completed").first()).toBeVisible();
  await expect(page.getByText("EFT details sent to you privately on WhatsApp.")).toBeVisible();
  await expect(page.getByText(/confirmed receipt of your payment/)).toBeVisible();
  await expect(page.getByText("Checked banking app")).toHaveCount(0);
  await page.goto("/account/notifications");
  await expect(page.getByText(/Update on purchase request/).first()).toBeVisible();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByText("0 unread")).toBeVisible();

  // The sold guitar is gone from the shop and its page.
  const res = await page.goto(`/shop/${product.slug}`);
  expect(res?.status()).toBe(404);
});

test("customers cannot open the admin area", async ({ page }) => {
  await login(page, customerEmail);
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
  const exp = await page.goto("/admin/exports/customers");
  expect(exp?.status()).toBe(403);
});

test("password reset via email", async ({ page }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(customerEmail);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/If an account exists/)).toBeVisible();
  const link = await waitForEmailLink(customerEmail, "Reset your Guitarz4U password");
  await page.goto(link);
  await expect(page).toHaveURL(/\/reset-password/);
  await page.locator('input[name="password"]').fill("NewGuitar5678");
  await page.getByLabel("Confirm new password").fill("NewGuitar5678");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Your password has been updated.")).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email address").fill(customerEmail);
  await page.getByLabel("Password").fill("NewGuitar5678");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account/);
});
