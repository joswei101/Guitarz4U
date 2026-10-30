import { expect, test } from '@playwright/test';
import { dismissCookies, helpers, humanPause, latestEmail, login, testPng } from './utils';

test.describe.configure({ mode: 'serial' });

let owner: { id: string; email: string };
let custA: { id: string; email: string };
let custB: { id: string; email: string };
let sellerUrl = '';
let repairId = '';
const guestSeller = `seller-${helpers.unique()}@example.test`;

test.beforeAll(async () => {
  owner = await helpers.makeUser('owner2', 'owner');
  custA = await helpers.makeUser('amara');
  custB = await helpers.makeUser('ben');
});

test('guest sells a broken guitar with a photo; private photo reaches the owner only', async ({ page }) => {
  await page.goto('/sell');
  await dismissCookies(page);
  await page.locator('#s-name').fill('Sipho Seller');
  await page.locator('#s-email').fill(guestSeller);
  await page.locator('#s-wa').fill('072 123 4567');
  await page.locator('#s-suburb').fill('Highlands North');
  await page.locator('#s-brand').fill('Epiphone');
  await page.locator('#s-model').fill('Les Paul Special');
  await page.locator('#s-cond').selectOption('broken');
  await page.locator('#s-faults').fill('Headstock snapped off, input jack loose.');
  await page.locator('#s-price').fill('900');
  await page.locator('#s-files').setInputFiles(testPng());
  await expect(page.getByText('Selected file 1').or(page.getByAltText('Selected file 1'))).toBeVisible();
  await page.getByRole('checkbox', { name: /not loose parts/ }).check();
  await page.getByRole('checkbox', { name: /I own this guitar/ }).check();
  await humanPause(page);
  await page.getByRole('button', { name: 'Send my guitar details' }).click();
  await expect(page.getByRole('heading', { name: 'Submission received' })).toBeVisible();
  await expect(page.getByText(/All 1 file\(s\) uploaded successfully/)).toBeVisible({ timeout: 20000 });
  const mail = await latestEmail(guestSeller, 'We received your guitar submission');
  expect(mail.Text).toContain('inspects every guitar in person');
  const ownerMail = await latestEmail('Joshuaweinfas@gmail.com', 'New seller enquiry');
  expect(ownerMail.Text).toContain('Photos: 1');
});

test('giveaway option cannot also have an asking price', async ({ page }) => {
  await page.goto('/sell');
  await dismissCookies(page);
  await page.getByRole('checkbox', { name: /give this guitar away/ }).check();
  await expect(page.locator('#s-price')).toHaveCount(0);
});

test('owner inspects, makes an offer, seller accepts; status is tracked', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await login(page, owner.email);
  await page.goto('/admin/sellers');
  await page.getByRole('link', { name: /SELL-/ }).first().click();
  await page.waitForURL(/\/admin\/sellers\/[0-9a-f-]{36}$/);
  sellerUrl = page.url();
  await expect(page.getByText('Headstock snapped off')).toBeVisible();
  // The private photo loads through a short-lived signed link.
  const img = page.getByAltText('Uploaded photo 1');
  await expect(img).toBeVisible();
  expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  expect(await img.getAttribute('src')).toContain('token=');

  await page.getByLabel('Inspection date').fill('2026-11-05');
  await page.getByLabel('Inspection results').fill('Clean break, repairable. Electronics fine.');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Saved.')).toBeVisible();

  await page.getByLabel('Amount (R)').fill('600');
  await page.locator('#onote').fill('Offer based on the headstock repair needed.');
  await page.getByRole('button', { name: 'Record offer' }).click();
  await expect(page.getByText('Offer recorded.')).toBeVisible();
  const mail = await latestEmail(guestSeller, 'Our offer');
  expect(mail.Text).toContain('R 600');

  await page.getByRole('button', { name: 'Record accepted' }).click();
  await expect(page.getByText('Decision recorded.')).toBeVisible();
  await expect(page.locator('.badge', { hasText: 'Offer accepted' }).first()).toBeVisible();

  await page.getByLabel('Change status').selectOption('handover-arranged');
  await page.getByRole('button', { name: 'Update status' }).click();
  await expect(page.getByText(/Status updated to "Handover arranged"/)).toBeVisible();
  const timeline = page.locator('.timeline');
  await expect(timeline).toContainText('Offer sent');
  await expect(timeline).toContainText('Offer accepted');
  await expect(timeline).toContainText('Handover arranged');
});

test('other customers cannot see a seller submission', async ({ page }) => {
  await login(page, custB.email);
  const id = sellerUrl.split('/').pop();
  expect((await page.goto(`/account/selling/${id}`))?.status()).toBe(404);
  await page.goto('/account/selling');
  await expect(page.getByText('Nothing submitted yet')).toBeVisible();
});

test('signed-in customer requests a repair with a photo and tracks it', async ({ page }) => {
  await login(page, custA.email);
  await page.goto('/repairs?service=setup');
  await page.locator('#r-name').fill('Amara Customer');
  await page.locator('#r-wa').fill('061 222 3333');
  await page.locator('#r-brand').fill('Ibanez');
  await page.locator('#r-model').fill('RG450');
  await page.locator('#r-problem').fill('Fret buzz on the low E and the action is very high.');
  await expect(page.getByRole('checkbox', { name: 'Setup and action adjustment' })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Fretwork' }).check();
  await page.locator('#r-files').setInputFiles(testPng());
  await page.getByRole('checkbox', { name: /I agree to the/ }).check();
  await humanPause(page);
  await page.getByRole('button', { name: 'Send repair request' }).click();
  await expect(page.getByText(/Your repair reference is REP-\d+/)).toBeVisible();
  await expect(page.getByText(/uploaded successfully/)).toBeVisible({ timeout: 20000 });
  await page.getByRole('link', { name: 'Track my repair' }).click();
  await page.getByRole('link', { name: /REP-/ }).click();
  await page.waitForURL(/\/account\/repairs\/[0-9a-f-]{36}$/);
  repairId = page.url().split('/').pop()!;
  await expect(page.getByText('No quote yet')).toBeVisible();
});

test('repair workflow: quote → approval required → work → extra cost approval → completion → payment', async ({ page, browser }) => {
  page.on('dialog', (d) => d.accept());
  await login(page, owner.email);
  await page.goto(`/admin/repairs/${repairId}`);

  // Work cannot start before approval.
  await page.locator('form:has(input[value="repairs"])').getByLabel('Change status').selectOption('repair-in-progress');
  await page.getByRole('button', { name: 'Update status' }).click();
  await expect(page.locator('.alert-error')).toContainText('The customer must approve the quote before work can start');

  await page.getByLabel('Labour (R)').fill('450');
  await page.getByLabel('Parts (R)').fill('120');
  await page.getByLabel('Parts details').fill('New strings, fret polish');
  await page.getByRole('button', { name: 'Send quote' }).click();
  await expect(page.getByText(/Quote v1 sent \(R 570\)/)).toBeVisible();
  const quoteMail = await latestEmail(custA.email, 'Your repair quote');
  expect(quoteMail.Text).toMatch(/Labour: R 450[\s\S]*Parts: R 120[\s\S]*Total: R 570/);

  // Customer B cannot see the repair.
  const ctxB = await browser.newContext();
  const pB = await ctxB.newPage();
  await login(pB, custB.email);
  expect((await pB.goto(`/account/repairs/${repairId}`))?.status()).toBe(404);
  await ctxB.close();

  // Customer A approves on the website.
  const ctxA = await browser.newContext();
  const pA = await ctxA.newPage();
  await login(pA, custA.email);
  await expect(pA.getByText('A repair quote is waiting for your decision.')).toBeVisible();
  await pA.goto(`/account/repairs/${repairId}`);
  await pA.getByRole('checkbox', { name: /I approve this quote of R 570/ }).check();
  await pA.getByRole('button', { name: 'Approve quote' }).click();
  await expect(pA.getByText('quote approved')).toBeVisible();

  // Now work can start.
  await page.reload();
  await page.locator('form:has(input[value="repairs"])').getByLabel('Change status').selectOption('repair-in-progress');
  await page.getByRole('button', { name: 'Update status' }).click();
  await expect(page.getByText(/Status updated to "Repair in progress"/)).toBeVisible();

  await page.getByLabel('Entry').fill('Levelled frets 1-5 and lowered the action.');
  await page.getByLabel('Parts used').fill('Strings');
  await page.getByRole('checkbox', { name: 'Show to customer' }).check();
  await page.getByRole('button', { name: 'Add entry' }).click();
  await expect(page.getByText('Work log updated.')).toBeVisible();

  // Extra cost found.
  await page.getByText('Send an additional-cost quote').click();
  await page.getByLabel('Labour (R)').fill('200');
  await page.getByLabel('Parts (R)').fill('0');
  await page.getByLabel('Explanation for the customer').fill('Nut slot needs re-cutting.');
  await page.getByRole('button', { name: 'Send quote' }).click();
  await expect(page.getByText(/Quote v2 sent \(R 200\)/)).toBeVisible();
  await page.locator('form:has(input[value="repairs"])').getByLabel('Change status').selectOption('repair-completed');
  await page.getByRole('button', { name: 'Update status' }).click();
  await expect(page.locator('.alert-error')).toContainText('awaiting the customer');

  // Customer approved by WhatsApp: the owner records it with evidence.
  await page.getByPlaceholder(/WhatsApp msg/).fill('WhatsApp 6 Nov 10:15 "yes go ahead"');
  await page.getByRole('button', { name: 'Record decision' }).click();
  await expect(page.getByText('Customer decision recorded.')).toBeVisible();
  await page.locator('form:has(input[value="repairs"])').getByLabel('Change status').selectOption('ready-for-collection');
  await page.getByRole('button', { name: 'Update status' }).click();
  await expect(page.getByText(/Status updated to "Ready for collection"/)).toBeVisible();
  await expect(page.getByText('Approved total: R 770')).toBeVisible();

  await page.getByText('Record a verified payment').click();
  await page.getByLabel('Amount received (R)').fill('770');
  await page.getByRole('checkbox', { name: /actually been received/ }).check();
  await page.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByText('Payment of R 770 recorded.')).toBeVisible();

  // Customer sees progress, quotes, visible work log and the recorded payment.
  await pA.goto(`/account/repairs/${repairId}`);
  await expect(pA.locator('.badge', { hasText: 'Ready for collection' }).first()).toBeVisible();
  await expect(pA.getByText('Levelled frets 1-5')).toBeVisible();
  await expect(pA.getByText(/Total approved: R 770 · Payments recorded: R 770/)).toBeVisible();
  await expect(pA.locator('.timeline')).toContainText('Additional cost quote v2');
  const readyMail = await latestEmail(custA.email, 'Ready for collection');
  expect(readyMail.Text).toContain('arrange collection');
  await ctxA.close();
});
