import { expect, test } from '@playwright/test';
import { dismissCookies, helpers, humanPause, latestEmail, login } from './utils';

test.describe('authentication', () => {
  const email = `newcustomer-${helpers.unique()}@example.test`;
  const password = 'First-password-1';

  test('register with email, confirm via the emailed link, and land in the account', async ({ page }) => {
    await page.goto('/auth/register');
    await dismissCookies(page);
    await page.getByLabel('Your name').fill('Thandi Example');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('checkbox', { name: /I agree/ }).check();
    await humanPause(page);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(/sent a confirmation link/)).toBeVisible();

    // Cannot sign in before confirming.
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await humanPause(page);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('.alert-error')).toContainText('confirm your email');

    const mail = await latestEmail(email);
    const link = mail.Text.match(/https?:\/\/\S+verify\S+/)?.[0];
    expect(link, 'confirmation link in email').toBeTruthy();
    await page.goto(link!);
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByRole('heading', { name: /Hello, Thandi/ })).toBeVisible();
  });

  test('sign out, wrong password is rejected, then sign in works', async ({ page }) => {
    await login(page, email, password);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/\?ok=/);
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth\/login\?next=%2Faccount/);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('wrong-password');
    await humanPause(page);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('.alert-error')).toContainText('Incorrect email or password');
    await login(page, email, password);
  });

  test('password reset by email', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await dismissCookies(page);
    await page.getByLabel('Email').fill(email);
    await humanPause(page);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText(/If an account exists/)).toBeVisible();
    const mail = await latestEmail(email, 'Reset');
    const link = mail.Text.match(/https?:\/\/\S+verify\S+/)?.[0];
    await page.goto(link!);
    await expect(page).toHaveURL(/\/auth\/reset-password/);
    await page.getByLabel(/^New password/).fill('Second-password-2');
    await page.getByLabel('Confirm new password').fill('Second-password-2');
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page).toHaveURL(/\/account\?ok=/);
    await page.context().clearCookies();
    await login(page, email, 'Second-password-2');
  });

  test('the reset form does not reveal whether an email is registered', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await dismissCookies(page);
    await page.getByLabel('Email').fill('nobody-here@example.test');
    await humanPause(page);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByText(/If an account exists/)).toBeVisible();
  });

  test('private pages are protected', async ({ page }) => {
    for (const p of ['/account', '/account/repairs', '/admin', '/admin/products']) {
      await page.goto(p);
      await expect(page).toHaveURL(/\/auth\/login/);
    }
    const customer = await helpers.makeUser('plain');
    await login(page, customer.email);
    await page.goto('/admin');
    await expect(page).toHaveURL('http://localhost:3000/');
    const res = await page.request.get('/admin/export/full');
    expect(res.status()).toBe(403);
  });

  test('staff only see the admin areas they have permission for', async ({ page }) => {
    const staff = await helpers.makeUser('repairstaff', 'staff', ['repairs']);
    await login(page, staff.email);
    await page.goto('/admin');
    const nav = page.getByRole('navigation', { name: 'Admin' });
    await expect(nav.getByRole('link', { name: 'Repairs' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Products' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Settings' })).toHaveCount(0);
    await page.goto('/admin/products');
    await expect(page).toHaveURL(/\/admin\?error=/);
    await page.goto('/admin/settings');
    await expect(page).toHaveURL(/\/admin\?error=/);
    expect((await page.request.get('/admin/export/payments')).status()).toBe(403);
  });

  test('Google sign-in button starts the real OAuth flow (provider must be enabled in Supabase)', async ({ page }) => {
    await page.goto('/auth/login');
    await dismissCookies(page);
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/auth/v1/authorize') && r.url().includes('provider=google')),
      page.getByRole('button', { name: 'Continue with Google' }).click(),
    ]);
    expect(req.url()).toContain('redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
  });
});
