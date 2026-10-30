import { expect, test, type Page } from '@playwright/test';
import { dismissCookies, helpers, humanPause, latestEmail, login, testPng } from './utils';

test.describe.configure({ mode: 'serial' });

let owner: { id: string; email: string };
let custA: { id: string; email: string };
let custB: { id: string; email: string };
const alertEmail = `classical-fan-${helpers.unique()}@example.test`;
const guestOfferEmail = `offer-${helpers.unique()}@example.test`;

test.beforeAll(async () => {
  owner = await helpers.makeUser('owner', 'owner');
  custA = await helpers.makeUser('alice');
  custB = await helpers.makeUser('bongani');
});

async function createListing(page: Page, f: { brand: string; model: string; category: string; condition: string; price: string; defects: string; featured?: boolean }) {
  page.on('dialog', (d) => d.accept());
  await page.goto('/admin/products/new');
  await page.getByLabel(/^Brand/).fill(f.brand);
  await page.getByLabel(/^Model/).fill(f.model);
  await page.getByLabel(/^Category/).selectOption(f.category);
  await page.getByLabel(/^Condition/).selectOption(f.condition);
  await page.getByLabel(/^Price/).fill(f.price);
  await page.getByLabel(/^Known defects/).fill(f.defects);
  await page.getByLabel(/^Included accessories/).fill('Gig bag');
  if (f.featured) await page.getByRole('checkbox', { name: /^Featured/ }).check();
  await page.getByRole('button', { name: 'Write a simple draft for me' }).click();
  await expect(page.getByLabel('Public description')).toHaveValue(new RegExp(`second-hand ${f.brand}`));
  await page.getByLabel('Serial number', { exact: true }).fill('PRIVATE-SN-123');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}\?ok=/);
  return page.url().match(/products\/([0-9a-f-]{36})/)![1];
}

test('owner creates a listing; it cannot be published until the description is approved', async ({ page }) => {
  await login(page, owner.email);
  await createListing(page, { brand: 'Fender', model: 'Player Stratocaster', category: 'electric', condition: 'very-good', price: '8500', defects: 'Small ding on the back near the neck joint.', featured: true });
  // Draft is not visible publicly.
  const slugUrl = await page.getByRole('link', { name: 'Preview listing' }).getAttribute('href');
  const anon = await page.context().browser()!.newPage();
  expect((await anon.goto(slugUrl!))?.status()).toBe(404);
  await anon.close();

  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.locator('.alert-error')).toContainText('description must be approved');

  await page.locator('#img-upload').setInputFiles(testPng());
  await expect(page.getByText('1 photo(s) uploaded.')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Main photo')).toBeVisible();

  await page.getByRole('checkbox', { name: /I have checked and approve/ }).check();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText('Published')).toBeVisible();
});

test('a "notify me" alert is emailed when a matching guitar is published', async ({ page, browser }) => {
  const guest = await browser.newPage();
  await guest.goto('/shop');
  await dismissCookies(guest);
  await guest.locator('#sa-email').fill(alertEmail);
  await guest.getByLabel('Type of guitar').selectOption('classical');
  await guest.getByRole('checkbox', { name: /Email me when matching/ }).check();
  await humanPause(guest);
  await guest.getByRole('button', { name: 'Notify me' }).click();
  await expect(guest.getByText(/We'll email you/)).toBeVisible();
  await guest.close();

  await login(page, owner.email);
  await createListing(page, { brand: 'Yamaha', model: 'C40', category: 'classical', condition: 'good', price: '1500', defects: 'Light scratches on the top.' });
  await page.getByRole('checkbox', { name: /I have checked and approve/ }).check();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByText(/Published.*1 stock alert email/)).toBeVisible();
  const mail = await latestEmail(alertEmail, 'Yamaha C40');
  expect(mail.Text).toContain('/shop/yamaha-c40-');
  expect(mail.Text).toMatch(/Unsubscribe from this alert: http:\/\/localhost:3000\/alerts\/unsubscribe\//);
});

test('shop search, filters and sorting', async ({ page }) => {
  await page.goto('/');
  await dismissCookies(page);
  await expect(page.getByText('Featured guitar')).toBeVisible();
  await expect(page.locator('.hero-feature').getByText('Fender Player Stratocaster')).toBeVisible();

  await page.goto('/shop');
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByLabel('Search', { exact: true }).fill('strat');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(page.locator('.product-card')).toContainText('Fender');

  await page.goto('/shop?category=classical');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await expect(page.locator('.product-card')).toContainText('Yamaha');
  await page.goto('/shop?brand=Fender');
  await expect(page.locator('.product-card')).toContainText('Fender');
  await page.goto('/shop?condition=good');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.goto('/shop?max=2000');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.goto('/shop?sort=price-asc');
  await expect(page.locator('.product-card').first()).toContainText('Yamaha');
  await page.goto('/shop?sort=price-desc');
  await expect(page.locator('.product-card').first()).toContainText('Fender');

  // Private serial number never appears publicly; defects do.
  await page.locator('.product-card').first().getByRole('link').click();
  await expect(page.getByText('Small ding on the back')).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain('PRIVATE-SN-123');
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
  expect(ld.offers.priceCurrency).toBe('ZAR');
  expect(ld.offers.availableDeliveryMethod).toBe('https://schema.org/OnSitePickup');
});

test('customer: wishlist, enquiry cart and purchase enquiry (no payment)', async ({ page }) => {
  await login(page, custA.email);
  await page.goto('/shop?q=fender');
  await page.locator('.product-card').first().getByRole('link').click();
  await page.getByRole('button', { name: /Save to wishlist/ }).click();
  await expect(page.getByRole('button', { name: /Saved to wishlist/ })).toBeVisible();
  await page.goto('/account/wishlist');
  await expect(page.locator('.product-card')).toContainText('Fender');

  await page.goto('/shop?q=fender');
  await page.locator('.product-card').first().getByRole('link').click();
  await page.getByRole('button', { name: 'Add to enquiry cart' }).click();
  await expect(page).toHaveURL(/\/cart/);
  await expect(page.getByRole('link', { name: /1 item in enquiry cart/ })).toBeVisible();
  await expect(page.getByText('not a payment').first()).toBeVisible();
  await page.getByLabel('Your name').fill('Alice Customer');
  await page.getByLabel('WhatsApp / phone').fill('082 555 1234');
  await page.getByRole('checkbox', { name: /not a payment/ }).check();
  await humanPause(page);
  await page.getByRole('button', { name: 'Send enquiry (no payment)' }).click();
  await expect(page.getByRole('heading', { name: 'Enquiry sent — thank you!' })).toBeVisible();
  await expect(page.getByText(/Your enquiry ENQ-\d+ has been sent/)).toBeVisible();
  await expect(page.getByText('No payment has been taken, and the sale is not final')).toBeVisible();
  await expect(page.getByRole('link', { name: /0 items in enquiry cart/ })).toBeVisible();

  const ownerMail = await latestEmail('Joshuaweinfas@gmail.com', 'New purchase enquiry');
  expect(ownerMail.Text).toContain('Fender Player Stratocaster');
  const custMail = await latestEmail(custA.email, 'We received your enquiry');
  expect(custMail.Text).toContain('not a payment');
});

test('reservations: 48-hour hold, blocks other customers, cancellable, and expires', async ({ page, browser }) => {
  await login(page, custA.email);
  await page.goto('/shop?q=yamaha');
  await page.locator('.product-card').first().getByRole('link').click();
  await page.waitForURL(/\/shop\/yamaha-c40-/);
  const productUrl = page.url();
  await page.locator('summary', { hasText: 'Reserve for 48 hours' }).click();
  await page.locator('#r-name').fill('Alice Customer');
  await page.locator('#r-phone').fill('082 555 1234');
  await page.getByRole('checkbox', { name: /not a payment/ }).check();
  await humanPause(page);
  await page.getByRole('button', { name: 'Reserve for 48 hours' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Reservation confirmed.' })).toContainText(/You have reserved this guitar until \d+ \w+ 20\d\d, \d\d:\d\d \(SAST\) \(ref RES-\d+\)/);
  const mail = await latestEmail(custA.email, 'Reservation RES-');
  expect(mail.Text).toContain('A reservation is not a payment');

  // Customer B sees it as reserved and cannot reserve it.
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await login(pageB, custB.email);
  await pageB.goto(productUrl);
  await expect(pageB.getByText('currently reserved by another customer')).toBeVisible();
  await expect(pageB.locator('summary', { hasText: 'Reserve for 48 hours' })).toHaveCount(0);
  await expect(pageB.getByRole('button', { name: 'Add to enquiry cart' })).toHaveCount(0);

  // A cancels; B can now see it available.
  page.on('dialog', (d) => d.accept());
  await page.goto('/account/reservations');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Reservation cancelled')).toBeVisible();
  await pageB.goto(productUrl);
  await expect(pageB.locator('summary', { hasText: 'Reserve for 48 hours' })).toBeVisible();

  // B reserves; simulate the 48 hours passing; it is released automatically.
  await pageB.locator('summary', { hasText: 'Reserve for 48 hours' }).click();
  await pageB.locator('#r-name').fill('Bongani');
  await pageB.locator('#r-phone').fill('083 111 2222');
  await pageB.getByRole('checkbox', { name: /not a payment/ }).check();
  await humanPause(pageB);
  await pageB.getByRole('button', { name: 'Reserve for 48 hours' }).click();
  await expect(pageB.getByText('Reservation confirmed.')).toBeVisible();
  helpers.psql(`update public.reservations set expires_at = now() - interval '1 minute' where status = 'active' and user_id = '${custB.id}'`);
  await page.goto(productUrl);
  await expect(page.locator('summary', { hasText: 'Reserve for 48 hours' })).toBeVisible();
  await pageB.goto('/account/reservations');
  await expect(pageB.getByText('Expired')).toBeVisible();
  await ctxB.close();
});

test('offers are recorded, never auto-accepted, and the owner can respond', async ({ page, browser }) => {
  const guest = await browser.newPage();
  await guest.goto('/shop?q=fender');
  await dismissCookies(guest);
  await guest.locator('.product-card').first().getByRole('link').click();
  await guest.getByText('Make an offer').click();
  await guest.getByLabel(/^Your offer/).fill('7000');
  await guest.locator('#o-name').fill('Offer Guest');
  await guest.locator('#o-email').fill(guestOfferEmail);
  await guest.locator('form:has(#o-amount)').getByRole('checkbox').check();
  await humanPause(guest);
  await guest.getByRole('button', { name: 'Send offer' }).click();
  await expect(guest.getByText(/Offers are not accepted automatically/)).toBeVisible();
  await guest.close();

  await login(page, owner.email);
  await page.goto('/admin/offers');
  const card = page.locator('section.card', { hasText: 'R 7 000' });
  await expect(card).toContainText('New');
  await card.getByLabel('Change status').selectOption('accepted');
  await card.getByRole('button', { name: 'Update status' }).click();
  await expect(page.getByText(/Status updated to "Accepted". Customer notified./)).toBeVisible();
  const mail = await latestEmail(guestOfferEmail, 'Accepted');
  expect(mail.Subject).toMatch(/Your offer OFF-\d+: Accepted/);
});

test('owner records a verified payment and marks the guitar sold', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await login(page, owner.email);
  await page.goto('/admin/enquiries');
  await page.getByRole('link', { name: /ENQ-/ }).first().click();
  await page.getByText('Record a verified payment').click();
  await page.getByLabel('Amount received (R)').fill('8500');
  await page.getByRole('button', { name: 'Record payment' }).click();
  // Browser-side "required" stops it until the owner confirms they checked.
  await expect(page.getByText('Payment of R 8 500 recorded.')).toHaveCount(0);
  await page.getByRole('checkbox', { name: /actually been received/ }).check();
  await page.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByText('Payment of R 8 500 recorded.')).toBeVisible();

  await page.getByRole('link', { name: /Fender Player Stratocaster/ }).click();
  await page.getByRole('button', { name: 'Mark as sold' }).click();
  await expect(page.getByText('Marked as sold.')).toBeVisible();

  await page.goto('/shop');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.goto('/sold');
  await expect(page.locator('.product-card')).toContainText('Fender');
  await page.locator('.product-card').getByRole('link').click();
  await expect(page.locator('.price-lg')).toHaveText('Sold');
  await expect(page.getByRole('button', { name: 'Add to enquiry cart' })).toHaveCount(0);

  // Reports count only the recorded payment as revenue.
  await page.goto('/admin/reports');
  await expect(page.locator('.stat', { hasText: 'Guitar sales received' })).toContainText('R 8 500');
});

test('unpublish, archive and restore a listing', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await login(page, owner.email);
  await page.goto('/admin/products?q=yamaha');
  await page.getByRole('link', { name: /Yamaha C40/ }).click();
  await page.getByRole('button', { name: 'Unpublish' }).click();
  await expect(page.getByText('Unpublished')).toBeVisible();
  await page.getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByText('Archived (hidden).')).toBeVisible();
  const anon = await page.context().browser()!.newPage();
  await anon.goto('/shop');
  await expect(anon.locator('.product-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Restore to available' }).click();
  await expect(page.getByText('Published')).toBeVisible();
  await anon.goto('/shop');
  await expect(anon.locator('.product-card')).toHaveCount(1);
  await anon.close();
  // Every change is in the audit log with the owner's email.
  await page.goto('/admin/audit?table=products');
  await expect(page.locator('table.data')).toContainText(owner.email);
});
