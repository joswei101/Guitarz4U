import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { helpers, humanPause, login } from './utils';

test.describe.configure({ mode: 'serial' });

let owner: { id: string; email: string };
let cust: { id: string; email: string };

test.beforeAll(async () => {
  owner = await helpers.makeUser('owner3', 'owner');
  cust = await helpers.makeUser('reviewer');
});

test('reviews: only registered customers can write; owner moderates before publication', async ({ page, browser }) => {
  await page.goto('/reviews');
  await expect(page.getByText('Reviews can only be written by registered customers.')).toBeVisible();

  await login(page, cust.email);
  await page.goto('/reviews');
  await page.getByLabel('Display name').fill('Lerato');
  await page.getByLabel('Rating').selectOption('5');
  await page.getByLabel(/^Your review/).fill('Great setup on my acoustic, explained everything clearly.');
  await page.getByRole('checkbox', { name: /honest experience/ }).check();
  await humanPause(page);
  await page.getByRole('button', { name: 'Submit review' }).click();
  await expect(page.getByText('will appear once the owner has approved it')).toBeVisible();
  await page.goto('/reviews');
  await expect(page.getByRole('heading', { name: 'No reviews yet' })).toBeVisible(); // not published yet

  const ctx = await browser.newContext();
  const admin = await ctx.newPage();
  await login(admin, owner.email);
  await admin.goto('/admin/reviews');
  await admin.getByRole('button', { name: /Approve/ }).click();
  await expect(admin.getByText('Review approved.')).toBeVisible();
  await ctx.close();

  await page.goto('/reviews');
  await expect(page.getByText('Great setup on my acoustic')).toBeVisible();
  await expect(page.getByText('— Lerato')).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain(cust.email);
});

test('profile and notification preferences can be changed', async ({ page }) => {
  await login(page, cust.email);
  await page.goto('/account/profile');
  await page.getByLabel('Full name').fill('Lerato Updated');
  await page.getByLabel('WhatsApp number').fill('071 000 1111');
  await page.getByRole('checkbox', { name: /Email me updates/ }).uncheck();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Your details have been saved.')).toBeVisible();
  expect(helpers.psql(`select full_name || '|' || notify_email from public.profiles where id='${cust.id}'`)).toBe('Lerato Updated|false');
});

test('owner can edit website text and FAQs without code', async ({ page }) => {
  await login(page, owner.email);
  await page.goto('/admin/content/about');
  const body = page.getByLabel('Text (Markdown)');
  await body.fill((await body.inputValue()) + '\n\nWe have been fixing guitars since 2015.');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('The change is live')).toBeVisible();
  await page.goto('/about');
  await expect(page.getByText('We have been fixing guitars since 2015.')).toBeVisible();

  await page.goto('/admin/faqs');
  const add = page.locator('form', { has: page.getByRole('button', { name: 'Add FAQ' }) });
  await add.getByLabel('Question').fill('Do you buy amplifiers?');
  await add.getByLabel('Answer').fill('No — guitars only.');
  await add.getByRole('button', { name: 'Add FAQ' }).click();
  await expect(page.getByText('FAQ added.')).toBeVisible();
  await page.goto('/faq');
  await expect(page.getByText('Do you buy amplifiers?')).toBeVisible();

  await page.goto('/admin/settings');
  await page.getByLabel(/^Warranty period/).fill('90');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Settings saved.')).toBeVisible();
  await page.goto('/legal/repair-terms');
  await expect(page.getByText(/guaranteed for 90 days/)).toBeVisible();
});

test('admin exports: CSV and full backup download', async ({ page }) => {
  await login(page, owner.email);
  await page.goto('/admin/export');
  const [csv] = await Promise.all([page.waitForEvent('download'), page.locator('a[href="/admin/export/reviews"]').click()]);
  const text = readFileSync(await csv.path(), 'utf8');
  expect(text).toContain('display_name');
  expect(text).toContain('Lerato');
  const [full] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download full backup' }).click()]);
  const json = JSON.parse(readFileSync(await full.path(), 'utf8'));
  expect(Object.keys(json)).toEqual(expect.arrayContaining(['products', 'repairs', 'payments', 'audit_log', 'customers']));
});

test('customer data export contains only their own data', async ({ page }) => {
  await login(page, cust.email);
  await page.goto('/account/privacy');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download my data' }).click()]);
  const data = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  expect(data.account.email).toBe(cust.email);
  expect(data.reviews).toHaveLength(1);
  expect(JSON.stringify(data)).not.toContain(owner.email);
});

test('account deletion: blocked while a repair is in progress, works otherwise', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  // A customer with a repair in the workshop cannot delete their account yet.
  const busy = await helpers.makeUser('busy');
  await helpers.admin.from('repairs').insert({ user_id: busy.id, name: 'Busy', email: busy.email, brand: 'b', model: 'm', problem: 'needs a setup', status: 'under-review' });
  await login(page, busy.email);
  await page.goto('/account/privacy');
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.locator('.alert-error')).toContainText('in progress');
  await page.context().clearCookies();

  // The reviewer has nothing in progress: deletion succeeds; their review is removed.
  await login(page, cust.email);
  await page.goto('/account/privacy');
  await page.getByLabel('Type DELETE to confirm').fill('delete please');
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.locator('.alert-error')).toContainText('Type DELETE');
  await page.getByLabel('Type DELETE to confirm').fill('DELETE');
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page).toHaveURL(/\/\?ok=/);
  await expect(page.getByText('Your account has been deleted.')).toBeVisible();
  expect(helpers.psql(`select count(*) from auth.users where id='${cust.id}'`)).toBe('0');
  expect(helpers.psql(`select count(*) from public.reviews where display_name='Lerato'`)).toBe('0');
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(cust.email);
  await page.getByLabel('Password').fill(helpers.PASSWORD);
  await humanPause(page);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.alert-error')).toContainText('Incorrect email or password');
});
